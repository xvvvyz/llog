import * as outboxStorage from '@/features/offline/storage';
import * as outboxState from '@/features/offline/outbox-state';
import * as outboxNormalize from '@/features/offline/outbox-normalize';
import * as React from 'react';
import type * as types from '@/features/offline/types';

type OutboxSnapshot = types.PersistedOutbox & { hydrated: boolean };

const emptyOutboxSnapshot = (ownerUserId?: string): OutboxSnapshot => ({
  attachments: [],
  drafts: [],
  hydrated: false,
  ownerUserId,
  recordPins: [],
  submissions: [],
  submittedRecordDraftIds: [],
  version: 1,
});

let activeOwnerUserId: string | undefined;
let snapshot: OutboxSnapshot = emptyOutboxSnapshot();
let hydratePromise: Promise<void> | undefined;
let writePromise: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const persist = (next: OutboxSnapshot) => {
  const persisted: types.PersistedOutbox = {
    attachments: next.attachments,
    drafts: next.drafts,
    ownerUserId: next.ownerUserId,
    recordPins: next.recordPins,
    submissions: next.submissions,
    submittedRecordDraftIds: next.submittedRecordDraftIds,
    version: 1,
  };

  const previousWrite = writePromise;

  writePromise = (async () => {
    try {
      await previousWrite;
    } catch {
      // The previous write already reported its error.
    }

    try {
      await outboxStorage.writePersistedOutbox(persisted);
    } catch (error) {
      console.error('Failed to persist offline outbox', error);
    }
  })();
};

const setSnapshot = (
  update: OutboxSnapshot | ((current: OutboxSnapshot) => OutboxSnapshot),
  options: { persist?: boolean } = { persist: true }
) => {
  const next = typeof update === 'function' ? update(snapshot) : update;

  snapshot =
    next.ownerUserId || !activeOwnerUserId
      ? next
      : { ...next, ownerUserId: activeOwnerUserId };

  emit();
  if (options.persist !== false && snapshot.ownerUserId) persist(snapshot);
};

export const subscribeOutbox = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getOutboxSnapshot = () => snapshot;

export const ensureOutboxHydrated = () => {
  if (!activeOwnerUserId) {
    setSnapshot(
      { ...emptyOutboxSnapshot(), hydrated: true },
      { persist: false }
    );

    return Promise.resolve();
  }

  const hydrateOutbox = async () => {
    try {
      const ownerUserId = activeOwnerUserId;
      const persisted = await outboxStorage.readPersistedOutbox(ownerUserId);
      const discardedAttachments = getDiscardedSubmissionAttachments(persisted);

      const discardedAttachmentIds = new Set(
        discardedAttachments.map((attachment) => attachment.id)
      );

      const attachments = await Promise.all(
        persisted.attachments
          .filter((attachment) => !discardedAttachmentIds.has(attachment.id))
          .map(async (attachment) => ({
            ...attachment,
            localUri: await outboxStorage.getAttachmentRuntimeUri(attachment),
          }))
      );

      if (activeOwnerUserId !== ownerUserId) return;

      const next = outboxState.mergeOutboxForHydration({
        current: snapshot,
        persisted: { ...persisted, attachments, ownerUserId },
      });

      setSnapshot(next, { persist: outboxState.hasOutboxContent(next) });

      if (discardedAttachments.length > 0) {
        await Promise.all(
          discardedAttachments.map((attachment) =>
            outboxStorage.deleteAttachmentBinary(
              attachment.id,
              attachment.localUri
            )
          )
        );
      }
    } catch (error) {
      hydratePromise = undefined;

      setSnapshot(
        { ...emptyOutboxSnapshot(activeOwnerUserId), hydrated: true },
        { persist: false }
      );

      console.error('Failed to hydrate offline outbox', error);
    }
  };

  hydratePromise ??= hydrateOutbox();
  return hydratePromise;
};

export const setOutboxOwnerUserId = (userId?: string) => {
  const ownerUserId = userId?.trim() || undefined;
  if (activeOwnerUserId === ownerUserId) return;
  activeOwnerUserId = ownerUserId;
  hydratePromise = undefined;

  setSnapshot(
    { ...emptyOutboxSnapshot(ownerUserId), hydrated: !ownerUserId },
    { persist: false }
  );

  if (ownerUserId) void ensureOutboxHydrated();
};

export const useOutboxSnapshot = () => {
  React.useEffect(() => {
    void ensureOutboxHydrated();
  }, []);

  return React.useSyncExternalStore(
    subscribeOutbox,
    getOutboxSnapshot,
    getOutboxSnapshot
  );
};

export const sortQueuedAttachments = <
  T extends Pick<types.QueuedAttachment, 'order'>,
>(
  attachments: T[]
) => [...attachments].sort((a, b) => a.order - b.order);

const sameParent = (
  attachment: types.QueuedAttachment,
  parent: types.QueuedParent
) =>
  attachment.parentType === parent.parentType &&
  attachment.parentId === parent.parentId &&
  attachment.recordId === parent.recordId;

export const submissionOwnsAttachment = outboxState.submissionOwnsAttachment;

export const getDiscardedSubmissionAttachments =
  outboxState.getDiscardedSubmissionAttachments;

export const getDiscardedSubmissions = outboxState.getDiscardedSubmissions;

export const getAutoSyncableSubmissions =
  outboxState.getAutoSyncableSubmissions;

export const getStartableAutoSyncSubmissions =
  outboxState.getStartableAutoSyncSubmissions;

export const getNextAutoRetryTime = outboxState.getNextAutoRetryTime;

export const getPendingOutboxWork = outboxState.getPendingOutboxWork;

export const hasPendingOutboxWork = outboxState.hasPendingOutboxWork;

export const getQueuedRecordPins = (
  state: Pick<OutboxSnapshot, 'recordPins'>
) => state.recordPins;

export const getQueuedRecordPin = (
  state: Pick<OutboxSnapshot, 'recordPins'>,
  recordId?: string
) =>
  recordId
    ? state.recordPins.find((recordPin) => recordPin.recordId === recordId)
    : undefined;

export const retryFailedOutboxWork = () => {
  setSnapshot((current) => {
    const hasFailedAttachment = current.attachments.some(
      (attachment) => attachment.status === 'error'
    );

    const hasFailedSubmission = current.submissions.some(
      (submission) => submission.status === 'error'
    );

    if (!hasFailedAttachment && !hasFailedSubmission) return current;

    return {
      ...current,
      attachments: current.attachments.map((attachment) =>
        attachment.status === 'error'
          ? { ...attachment, error: undefined, status: 'queued' }
          : attachment
      ),
      submissions: current.submissions.map((submission) =>
        submission.status === 'error'
          ? {
              ...submission,
              error: undefined,
              nextRetryAt: undefined,
              status: 'pending',
            }
          : submission
      ) as typeof current.submissions,
    };
  });
};

export const getQueuedAttachmentsForParent = (
  state: Pick<OutboxSnapshot, 'attachments'>,
  parent?: types.QueuedParent
) => {
  if (!parent) return [];

  return sortQueuedAttachments(
    state.attachments.filter(
      (attachment) => sameParent(attachment, parent) && !attachment.submissionId
    )
  );
};

export const getQueuedAttachmentsForSubmission = (
  state: Pick<OutboxSnapshot, 'attachments'>,
  submission: types.QueuedSubmission
) =>
  sortQueuedAttachments(
    state.attachments.filter((attachment) =>
      submissionOwnsAttachment(submission, attachment)
    )
  );

export const queueAttachment = (input: types.QueueAttachmentInput) => {
  const attachment: types.QueuedAttachment = {
    ...input,
    localUri: input.localUri,
    mimeType: outboxNormalize.normalizeOptionalString(input.mimeType),
    name: outboxNormalize.normalizeOptionalString(input.name),
    size: outboxNormalize.normalizeOptionalNumber(input.size),
    status: input.status ?? 'queued',
  };

  setSnapshot((current) => ({
    ...current,
    attachments: [
      ...current.attachments.filter((item) => item.id !== attachment.id),
      attachment,
    ],
  }));

  return attachment;
};

export const removeQueuedAttachment = async (fileId: string) => {
  const existing = snapshot.attachments.find((item) => item.id === fileId);

  setSnapshot((current) => ({
    ...current,
    attachments: current.attachments.filter((item) => item.id !== fileId),
  }));

  await outboxStorage.deleteAttachmentBinary(fileId, existing?.localUri);
};

export const updateQueuedAttachment = (
  fileId: string,
  patch:
    | Partial<types.QueuedAttachment>
    | ((attachment: types.QueuedAttachment) => Partial<types.QueuedAttachment>)
) => {
  setSnapshot((current) => ({
    ...current,
    attachments: current.attachments.map((attachment) => {
      if (attachment.id !== fileId) return attachment;
      const nextPatch = typeof patch === 'function' ? patch(attachment) : patch;
      return { ...attachment, ...nextPatch };
    }),
  }));
};

export const setQueuedAttachmentStatus = (
  fileId: string,
  status: types.QueuedAttachmentStatus,
  error?: string
) => {
  updateQueuedAttachment(fileId, {
    error: status === 'error' ? error : undefined,
    status,
  });
};

export const markQueuedAttachmentUploaded = (
  fileId: string,
  file?: types.QueuedFileSnapshot
) => {
  const [uploadedFile] = outboxNormalize.normalizeQueuedFileSnapshots(
    file ? [file] : undefined
  );

  setSnapshot((current) => {
    const attachment = current.attachments.find((item) => item.id === fileId);
    const now = new Date().toISOString();

    return {
      ...current,
      attachments: current.attachments.map((attachment) =>
        attachment.id === fileId
          ? { ...attachment, error: undefined, status: 'uploaded' }
          : attachment
      ),
      submissions:
        attachment && uploadedFile
          ? current.submissions.map((submission) =>
              submissionOwnsAttachment(submission, attachment)
                ? ({
                    ...submission,
                    files: outboxNormalize.upsertQueuedFileSnapshot(
                      submission.files,
                      uploadedFile
                    ),
                    updatedAt: now,
                  } as types.QueuedSubmission)
                : submission
            )
          : current.submissions,
    };
  });
};

export const queueSubmission = (input: types.QueueSubmissionInput) => {
  const now = new Date().toISOString();
  const id = `${input.type}:${input.contentId}`;
  const links = input.links ?? [];
  const files = outboxNormalize.normalizeQueuedFileSnapshots(input.files);

  const submission: types.QueuedSubmission =
    input.type === 'record'
      ? {
          authorId: input.authorId,
          contentId: input.contentId,
          createdAt: now,
          files,
          id,
          isPinned: input.isPinned,
          links,
          logId: input.logId,
          needsDraftReplay: input.needsDraftReplay,
          status: 'pending',
          tagIds: (input.tags ?? []).map((tag) => tag.id),
          tags: input.tags ?? [],
          teamId: input.teamId,
          text: input.text,
          type: 'record',
          updatedAt: now,
        }
      : {
          authorId: input.authorId,
          contentId: input.contentId,
          createdAt: now,
          files,
          id,
          links,
          needsDraftReplay: input.needsDraftReplay,
          recordId: input.recordId,
          status: 'pending',
          teamId: input.teamId,
          text: input.text,
          type: 'reply',
          updatedAt: now,
        };

  setSnapshot((current) => ({
    ...current,
    attachments: current.attachments.map((attachment) =>
      (
        input.type === 'record'
          ? attachment.parentType === 'record' &&
            attachment.parentId === input.contentId
          : attachment.parentType === 'reply' &&
            attachment.parentId === input.contentId &&
            attachment.recordId === input.recordId
      )
        ? { ...attachment, submissionId: id }
        : attachment
    ),
    submissions: [
      ...current.submissions.filter((item) => item.id !== id),
      submission,
    ],
  }));

  return submission;
};

export const updateQueuedSubmission = (
  submissionId: string,
  patch:
    | Partial<types.QueuedSubmission>
    | ((submission: types.QueuedSubmission) => Partial<types.QueuedSubmission>)
) => {
  setSnapshot((current) => ({
    ...current,
    submissions: current.submissions.map((submission) => {
      if (submission.id !== submissionId) return submission;
      const nextPatch = typeof patch === 'function' ? patch(submission) : patch;

      return {
        ...submission,
        ...nextPatch,
        updatedAt: new Date().toISOString(),
      } as types.QueuedSubmission;
    }),
  }));
};

export const updateQueuedRecordPin = ({
  isPinned,
  recordId,
}: {
  isPinned: boolean;
  recordId: string;
}) => {
  if (!recordId) return;
  const submissionId = `record:${recordId}`;

  setSnapshot((current) => {
    const hasQueuedRecord = current.submissions.some(
      (submission) => submission.id === submissionId
    );

    if (hasQueuedRecord) {
      return {
        ...current,
        submissions: current.submissions.map((submission) => {
          if (submission.id !== submissionId || submission.type !== 'record') {
            return submission;
          }

          return {
            ...submission,
            isPinned,
            updatedAt: new Date().toISOString(),
          } as types.QueuedSubmission;
        }),
      };
    }

    const now = new Date().toISOString();

    return {
      ...current,
      recordPins: [
        ...current.recordPins.filter(
          (recordPin) => recordPin.recordId !== recordId
        ),
        { id: `record-pin:${recordId}`, isPinned, recordId, updatedAt: now },
      ],
    };
  });
};

export const queueRecordPin = updateQueuedRecordPin;

export const rememberSubmittedRecordDraftId = (recordId?: string) => {
  const id = recordId?.trim();
  if (!id) return;

  setSnapshot((current) => ({
    ...current,
    submittedRecordDraftIds: outboxState.mergeSubmittedRecordDraftIds(
      current.submittedRecordDraftIds.filter((item) => item !== id),
      [id]
    ),
  }));
};

export const clearQueuedRecordPin = ({
  isPinned,
  recordId,
}: {
  isPinned?: boolean;
  recordId: string;
}) => {
  if (!recordId) return;

  setSnapshot((current) => ({
    ...current,
    recordPins: current.recordPins.filter(
      (recordPin) =>
        recordPin.recordId !== recordId ||
        (isPinned != null && recordPin.isPinned !== isPinned)
    ),
  }));
};

export const updateQueuedRecordTagSelection = ({
  recordId,
  selected,
  tag,
  tagId,
}: {
  recordId: string;
  selected: boolean;
  tag?: types.QueuedTagSnapshot;
  tagId: string;
}) => {
  updateQueuedSubmission(`record:${recordId}`, (submission) => {
    if (submission.type !== 'record') return {};
    if (selected && !tag) return {};

    const tags = selected
      ? [
          ...(tag ? [tag] : []),
          ...submission.tags.filter((item) => item.id !== tagId),
        ].sort((a, b) => a.order - b.order)
      : submission.tags.filter((item) => item.id !== tagId);

    return { tagIds: tags.map((item) => item.id), tags };
  });
};

const sortQueuedLinks = (links: types.QueuedLinkSnapshot[]) =>
  [...links].sort((a, b) => a.order - b.order);

const patchQueuedSubmissionLinks = (links: types.QueuedLinkSnapshot[]) => ({
  links: sortQueuedLinks(links),
});

const patchQueuedDraftLinks = (links: types.QueuedLinkSnapshot[]) => ({
  linksUpdated: true,
  links: sortQueuedLinks(links),
});

const getSubmissionIdForParent = ({
  parentId,
  parentType,
}: {
  parentId: string;
  parentType: 'record' | 'reply';
}) => `${parentType}:${parentId}`;

const getDraftIdForParent = ({
  parentId,
  parentType,
}: {
  parentId: string;
  parentType: 'record' | 'reply';
}) => `${parentType}:${parentId}`;

const createEmptyDraft = ({
  parentId,
  parentType,
}: {
  parentId: string;
  parentType: 'record' | 'reply';
}): types.QueuedDraft => {
  const now = new Date().toISOString();
  const id = getDraftIdForParent({ parentId, parentType });

  return parentType === 'record'
    ? {
        contentId: parentId,
        id,
        links: [],
        tagIds: [],
        tags: [],
        type: 'record',
        updatedAt: now,
      }
    : { contentId: parentId, id, links: [], type: 'reply', updatedAt: now };
};

export const getQueuedDraftForParent = (
  state: Pick<OutboxSnapshot, 'drafts'>,
  parent?: { parentId: string; parentType: 'record' | 'reply' }
) => {
  if (!parent) return;
  const id = getDraftIdForParent(parent);
  return state.drafts.find((draft) => draft.id === id);
};

const updateQueuedDraft = (
  parent: { parentId: string; parentType: 'record' | 'reply' },
  patch:
    | Partial<types.QueuedDraft>
    | ((draft: types.QueuedDraft) => Partial<types.QueuedDraft>)
) => {
  const id = getDraftIdForParent(parent);

  setSnapshot((current) => {
    const existing =
      current.drafts.find((draft) => draft.id === id) ??
      createEmptyDraft(parent);

    const nextPatch = typeof patch === 'function' ? patch(existing) : patch;

    const nextDraft = {
      ...existing,
      ...nextPatch,
      updatedAt: new Date().toISOString(),
    } as types.QueuedDraft;

    return {
      ...current,
      drafts: [...current.drafts.filter((draft) => draft.id !== id), nextDraft],
    };
  });
};

export const addQueuedLink = ({
  link,
  parentId,
  parentType,
}: {
  link: types.QueuedLinkSnapshot;
  parentId: string;
  parentType: 'record' | 'reply';
}) => {
  updateQueuedSubmission(
    getSubmissionIdForParent({ parentId, parentType }),
    (submission) =>
      patchQueuedSubmissionLinks([
        link,
        ...submission.links.filter((item) => item.id !== link.id),
      ])
  );
};

export const addQueuedDraftLink = ({
  baseLinks,
  link,
  parentId,
  parentType,
}: {
  baseLinks?: types.QueuedLinkSnapshot[];
  link: types.QueuedLinkSnapshot;
  parentId: string;
  parentType: 'record' | 'reply';
}) => {
  if (!parentId) return;

  updateQueuedDraft({ parentId, parentType }, (draft) => {
    const links = draft.linksUpdated ? draft.links : (baseLinks ?? draft.links);

    return patchQueuedDraftLinks([
      link,
      ...links.filter((item) => item.id !== link.id),
    ]);
  });
};

export const updateQueuedLink = ({
  label,
  linkId,
  url,
}: {
  label: string;
  linkId: string;
  url: string;
}) => {
  setSnapshot((current) => ({
    ...current,
    submissions: current.submissions.map((submission) => {
      if (!submission.links.some((link) => link.id === linkId)) {
        return submission;
      }

      return {
        ...submission,
        ...patchQueuedSubmissionLinks(
          submission.links.map((link) =>
            link.id === linkId ? { ...link, label, url } : link
          )
        ),
        updatedAt: new Date().toISOString(),
      } as types.QueuedSubmission;
    }),
  }));
};

export const updateQueuedDraftLink = ({
  label,
  linkId,
  url,
}: {
  label: string;
  linkId: string;
  url: string;
}) => {
  setSnapshot((current) => ({
    ...current,
    drafts: current.drafts.map((draft) => {
      if (!draft.links.some((link) => link.id === linkId)) return draft;

      return {
        ...draft,
        ...patchQueuedDraftLinks(
          draft.links.map((link) =>
            link.id === linkId ? { ...link, label, url } : link
          )
        ),
        updatedAt: new Date().toISOString(),
      } as types.QueuedDraft;
    }),
  }));
};

export const removeQueuedLink = (linkId: string) => {
  setSnapshot((current) => ({
    ...current,
    submissions: current.submissions.map((submission) => {
      if (!submission.links.some((link) => link.id === linkId)) {
        return submission;
      }

      return {
        ...submission,
        ...patchQueuedSubmissionLinks(
          submission.links.filter((link) => link.id !== linkId)
        ),
        updatedAt: new Date().toISOString(),
      } as types.QueuedSubmission;
    }),
  }));
};

export const removeQueuedDraftLink = (linkId: string) => {
  setSnapshot((current) => ({
    ...current,
    drafts: current.drafts.map((draft) => {
      if (!draft.links.some((link) => link.id === linkId)) return draft;

      return {
        ...draft,
        ...patchQueuedDraftLinks(
          draft.links.filter((link) => link.id !== linkId)
        ),
        updatedAt: new Date().toISOString(),
      } as types.QueuedDraft;
    }),
  }));
};

export const reorderQueuedLinks = (orderedIds: string[]) => {
  if (!orderedIds.length) return;
  const orderById = new Map(orderedIds.map((id, order) => [id, order]));

  setSnapshot((current) => ({
    ...current,
    submissions: current.submissions.map((submission) => {
      if (!submission.links.some((link) => orderById.has(link.id))) {
        return submission;
      }

      return {
        ...submission,
        ...patchQueuedSubmissionLinks(
          submission.links.map((link) =>
            orderById.has(link.id)
              ? { ...link, order: orderById.get(link.id)! }
              : link
          )
        ),
        updatedAt: new Date().toISOString(),
      } as types.QueuedSubmission;
    }),
  }));
};

export const reorderQueuedDraftLinks = (orderedIds: string[]) => {
  if (!orderedIds.length) return;
  const orderById = new Map(orderedIds.map((id, order) => [id, order]));

  setSnapshot((current) => ({
    ...current,
    drafts: current.drafts.map((draft) => {
      if (!draft.links.some((link) => orderById.has(link.id))) return draft;

      return {
        ...draft,
        ...patchQueuedDraftLinks(
          draft.links.map((link) =>
            orderById.has(link.id)
              ? { ...link, order: orderById.get(link.id)! }
              : link
          )
        ),
        updatedAt: new Date().toISOString(),
      } as types.QueuedDraft;
    }),
  }));
};

export const updateQueuedDraftRecordPin = ({
  isPinned,
  recordId,
}: {
  isPinned: boolean;
  recordId: string;
}) => {
  if (!recordId) return;

  updateQueuedDraft({ parentId: recordId, parentType: 'record' }, (draft) =>
    draft.type === 'record' ? { isPinned } : {}
  );
};

export const updateQueuedDraftRecordTagSelection = ({
  baseTags,
  recordId,
  selected,
  tag,
  tagId,
}: {
  baseTags?: types.QueuedTagSnapshot[];
  recordId: string;
  selected: boolean;
  tag?: types.QueuedTagSnapshot;
  tagId: string;
}) => {
  if (!recordId) return;

  updateQueuedDraft({ parentId: recordId, parentType: 'record' }, (draft) => {
    if (draft.type !== 'record') return {};
    if (selected && !tag) return {};

    const currentTags = draft.tagsUpdated
      ? draft.tags
      : (baseTags ?? draft.tags);

    const tags = selected
      ? [
          ...(tag ? [tag] : []),
          ...currentTags.filter((item) => item.id !== tagId),
        ].sort((a, b) => a.order - b.order)
      : currentTags.filter((item) => item.id !== tagId);

    return { tagIds: tags.map((item) => item.id), tags, tagsUpdated: true };
  });
};

export const clearQueuedDraft = ({
  parentId,
  parentType,
}: {
  parentId: string;
  parentType: 'record' | 'reply';
}) => {
  if (!parentId) return;
  const id = getDraftIdForParent({ parentId, parentType });

  setSnapshot((current) => ({
    ...current,
    drafts: current.drafts.filter((draft) => draft.id !== id),
  }));
};

export const setQueuedSubmissionStatus = (
  submissionId: string,
  status: types.OutboxStatus,
  error?: string
) => {
  updateQueuedSubmission(submissionId, (submission) => {
    if (submission.status === 'discarded' && status !== 'discarded') return {};

    if (status === 'error') {
      const retryCount = (submission.retryCount ?? 0) + 1;

      return {
        error,
        nextRetryAt: outboxState.getNextAutoRetryAt({ retryCount }),
        retryCount,
        status,
      };
    }

    return {
      error: undefined,
      nextRetryAt: undefined,
      retryCount: status === 'complete' ? undefined : submission.retryCount,
      status,
    };
  });
};

export const discardQueuedSubmission = async (submissionId: string) => {
  const submission = snapshot.submissions.find(
    (item) => item.id === submissionId
  );

  const attachments = (
    submission
      ? getQueuedAttachmentsForSubmission(snapshot, submission)
      : snapshot.attachments.filter(
          (attachment) => attachment.submissionId === submissionId
        )
  ).map((attachment) => ({ id: attachment.id, localUri: attachment.localUri }));

  const attachmentIds = new Set(attachments.map((attachment) => attachment.id));

  setSnapshot((current) => ({
    ...current,
    attachments: current.attachments.filter(
      (attachment) => !attachmentIds.has(attachment.id)
    ),
    drafts: current.drafts.filter(
      (draft) => !submission || draft.id !== submission.id
    ),
    submissions: current.submissions.map((submission) =>
      submission.id === submissionId
        ? { ...submission, status: 'discarded' }
        : submission
    ),
  }));

  await Promise.all(
    attachments.map((attachment) =>
      outboxStorage.deleteAttachmentBinary(attachment.id, attachment.localUri)
    )
  );
};

export const pruneDiscardedSubmissionAttachments = async () => {
  const attachments = getDiscardedSubmissionAttachments(snapshot).map(
    (attachment) => ({ id: attachment.id, localUri: attachment.localUri })
  );

  if (!attachments.length) return;
  const attachmentIds = new Set(attachments.map((attachment) => attachment.id));

  setSnapshot((current) => ({
    ...current,
    attachments: current.attachments.filter(
      (attachment) => !attachmentIds.has(attachment.id)
    ),
  }));

  await Promise.all(
    attachments.map((attachment) =>
      outboxStorage.deleteAttachmentBinary(attachment.id, attachment.localUri)
    )
  );
};

export const clearCompletedSubmission = async (submissionId: string) => {
  const submission = snapshot.submissions.find(
    (item) => item.id === submissionId
  );

  const attachments = (
    submission
      ? getQueuedAttachmentsForSubmission(snapshot, submission)
      : snapshot.attachments.filter(
          (attachment) => attachment.submissionId === submissionId
        )
  ).map((attachment) => ({ id: attachment.id, localUri: attachment.localUri }));

  const attachmentIds = new Set(attachments.map((attachment) => attachment.id));

  setSnapshot((current) => ({
    ...current,
    attachments: current.attachments.filter(
      (attachment) => !attachmentIds.has(attachment.id)
    ),
    submissions: current.submissions.filter(
      (submission) => submission.id !== submissionId
    ),
  }));

  await Promise.all(
    attachments.map((attachment) =>
      outboxStorage.deleteAttachmentBinary(attachment.id, attachment.localUri)
    )
  );
};
