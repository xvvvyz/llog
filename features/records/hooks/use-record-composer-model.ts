import { visibleFileQuery } from '@/domain/files/query';
import * as recordStatus from '@/domain/records/status';
import * as queuedAttachmentUtils from '@/features/files/lib/queued-attachments';
import { useFileComposer } from '@/features/files/hooks/use-composer';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { useLogTemplates } from '@/features/logs/queries/use-templates';
import type { LogTemplate } from '@/features/logs/types/template';
import * as localEntry from '@/features/offline/local-entry';
import * as outboxStore from '@/features/offline/outbox-store';
import * as pendingEntries from '@/features/offline/pending-entries';
import * as queuedLinks from '@/features/offline/queued-links';
import * as queuedTags from '@/features/offline/queued-tags';
import { useProfile } from '@/features/account/queries/use-profile';
import { useComposerFileCallbacks } from '@/features/records/hooks/use-composer-file-callbacks';
import { useComposerLinkReorder } from '@/features/records/hooks/use-composer-link-reorder';
import { useComposerLinkAttachments } from '@/features/records/hooks/use-composer-link-attachments';
import { useIgnoredDraftIds } from '@/features/records/hooks/use-ignored-draft-ids';
import * as composerPayloads from '@/features/records/lib/composer-payloads';
import type { RecordTemplateAttachment } from '@/features/records/lib/record-template-attachments';
import * as recordTime from '@/features/records/lib/record-time';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import { deleteRecord } from '@/features/records/mutations/delete-record';
import { deleteRecordFile } from '@/features/records/mutations/delete-record-file';
import { finalizeRecordCopy } from '@/features/records/mutations/finalize-record-copy';
import { toggleRecordPin } from '@/features/records/mutations/toggle-pin';
import { updateRecordDraft } from '@/features/records/mutations/update-record-draft';
import { updateScheduledRecordSchedule } from '@/features/records/mutations/update-scheduled-record-schedule';
import { uploadRecordFile } from '@/features/records/mutations/upload-record-file';
import { useHasRecordTagsForLog } from '@/features/records/queries/use-has-record-tags-for-log';
import { useRecordDraft } from '@/features/records/queries/use-record-draft';
import { useTags } from '@/features/tags/queries/use-tags';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { blurActiveTextInput } from '@/lib/blur-active-text-input';
import { db } from '@/lib/db';
import type { RecordSheetParent } from '@/lib/sheet-names';
import { formatDate } from '@/lib/time';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { id } from '@instantdb/react-native';
import { PushPin, Tag } from 'phosphor-react-native';
import * as React from 'react';
import * as outboxHooks from '@/features/offline/outbox-hooks';
import { useOutboxNetworkReachability } from '@/features/offline/outbox-network';
import * as outboxSyncCore from '@/features/offline/outbox-sync-core';
import * as composerTextSession from '@/features/records/hooks/use-composer-text-session';
import * as spectrumClassNames from '@/theme/spectrum-class-names';
import { UI } from '@/theme/ui';
import * as recordTimeSheet2 from '@/features/records/components/record-time-sheet';

type ComposerToolbarIconButtonOptions = {
  accessibilityLabel?: string;
  activeClassName?: string;
  disabled?: boolean;
  icon: React.ComponentProps<typeof Icon>['icon'];
  isActive?: boolean;
  onPress: NonNullable<React.ComponentProps<typeof Button>['onPress']>;
};

const createComposerToolbarIconButton = ({
  accessibilityLabel,
  activeClassName,
  disabled,
  icon,
  isActive = false,
  onPress,
}: ComposerToolbarIconButtonOptions) =>
  React.createElement(
    Button,
    {
      accessibilityLabel,
      accessibilityState: { selected: isActive },
      disabled,
      onPress,
      size: 'icon-xs',
      variant: 'secondary',
    },
    React.createElement(Icon, {
      className: isActive ? activeClassName : undefined,
      icon,
      weight: isActive ? 'fill' : 'regular',
    })
  );

const getNextLinkOrder = (links?: { order?: number | null }[]) =>
  (links ?? []).reduce((max, item) => Math.max(max, item.order ?? 0), -1) + 1;

const mergeTagsById = <TagItem extends { id: string }>(
  ...tagSets: (TagItem[] | undefined)[]
) => {
  const tagsById = new Map<string, TagItem>();

  for (const tagSet of tagSets) {
    for (const tag of tagSet ?? []) {
      tagsById.set(tag.id, tag);
    }
  }

  return [...tagsById.values()];
};

export const useRecordComposerModel = () => {
  const [isRecordTimeSheetOpen, setIsRecordTimeSheetOpen] =
    React.useState(false);

  const [recordDateOverride, setRecordDateOverride] = React.useState<
    string | undefined
  >();

  const [recordDatePreviewNow, setRecordDatePreviewNow] = React.useState(() =>
    Date.now()
  );

  const [isTextareaFocused, setIsTextareaFocused] = React.useState(false);
  const recordTimeResetKeyRef = React.useRef<string | undefined>(undefined);
  const { ignoreDraftId, ignoredDraftIds } = useIgnoredDraftIds();
  const cleanupDraftIdsRef = React.useRef(new Set<string>());
  const sheetManager = useSheetManager();
  const profile = useProfile();
  const outbox = outboxHooks.useOutbox();
  const networkReachability = useOutboxNetworkReachability();
  const context = sheetManager.getContext('record-create');
  const isEdit = context === 'edit';
  const isCopy = context === 'copy';
  const isCreate = !isEdit && !isCopy;
  const isOpen = sheetManager.isOpen('record-create');

  const { isSubmitting, isSubmittingRef, runSubmit } = useSheetSubmitState({
    isOpen,
  });

  const sheetId = sheetManager.getId('record-create');
  const colorScheme = useColorScheme();

  const copyPayload = isCopy
    ? sheetManager.getPayload('record-create')
    : undefined;

  const createPayload = isCreate
    ? sheetManager.getPayload('record-create')
    : undefined;

  const createTeamId = composerPayloads.getPayloadTeamId(createPayload);

  const copyTargetLogIds = React.useMemo(
    () => composerPayloads.getCopyTargetLogIds(copyPayload),
    [copyPayload]
  );

  const isSingleTargetCopy = isCopy && copyTargetLogIds.length === 1;
  const logId = isEdit || isCopy ? undefined : sheetId;
  const draftLogId = isOpen && isCreate && outbox.hydrated ? logId : undefined;
  const editRecordId = isOpen && isEdit ? sheetId : undefined;
  const copyDraftRecordId = isOpen && isCopy ? sheetId : undefined;

  const draft = useRecordDraft({
    ignoredDraftIds,
    logId: draftLogId,
    teamId: createTeamId,
  });

  const templates = useLogTemplates({ enabled: isCreate, logId });

  const { data: editData } = db.useQuery(
    editRecordId
      ? {
          records: {
            $: { where: { id: editRecordId } },
            files: visibleFileQuery,
            links: {},
            log: { $: { fields: ['id'] } },
            tags: {
              $: {
                fields: ['color', 'id', 'name', 'order', 'teamId', 'type'],
                order: { order: 'asc' as const },
                where: { type: 'record' },
              },
            },
          },
        }
      : null
  );

  const queriedEditRecord = editData?.records?.[0];

  const pendingEditRecord = React.useMemo(
    () =>
      editRecordId
        ? outbox.submissions
            .filter(
              (
                submission
              ): submission is Extract<
                (typeof outbox.submissions)[number],
                { type: 'record' }
              > =>
                submission.type === 'record' &&
                submission.contentId === editRecordId &&
                pendingEntries.isActiveQueuedSubmission(submission)
            )
            .map((submission) =>
              pendingEntries.queuedRecordToEntry({
                attachments: outbox.attachments,
                profile,
                submission,
              })
            )[0]
        : undefined,
    [editRecordId, outbox.attachments, outbox.submissions, profile]
  );

  const editRecord =
    pendingEditRecord?.id === editRecordId
      ? pendingEditRecord
      : queriedEditRecord?.id === editRecordId
        ? queriedEditRecord
        : undefined;

  const { data: copyData, isLoading: copyLoading } = db.useQuery(
    copyDraftRecordId
      ? {
          records: {
            $: { where: { id: copyDraftRecordId } },
            files: visibleFileQuery,
            links: {},
            log: { $: { fields: ['id'] } },
            tags: {
              $: {
                fields: ['color', 'id', 'name', 'order', 'teamId', 'type'],
                order: { order: 'asc' as const },
                where: { type: 'record' },
              },
            },
          },
        }
      : null
  );

  const queriedCopyDraft = copyData?.records?.[0];

  const copyDraft =
    queriedCopyDraft?.id === copyDraftRecordId ? queriedCopyDraft : undefined;

  const record = isEdit ? editRecord : isCopy ? copyDraft : draft;
  const recordId = record?.id;
  const isEditingLocalRecord = isEdit && localEntry.hasLocalStatus(editRecord);
  const isServerRecordEdit = isEdit && !isEditingLocalRecord;

  const recordLogId = isEdit
    ? editRecord?.log?.id
    : isCopy
      ? copyTargetLogIds[0]
      : logId;

  const recordTeamId = record?.teamId ?? createTeamId;
  const shouldUseLogAccent = !isCopy || isSingleTargetCopy;
  const accentLogId = shouldUseLogAccent ? recordLogId : undefined;
  const logColor = useLogColor({ id: accentLogId });

  const accentColor = shouldUseLogAccent
    ? logColor[colorScheme === 'dark' ? 'lighter' : 'darker']
    : UI[colorScheme].primary;

  const accentColorClassName = shouldUseLogAccent
    ? spectrumClassNames.getSpectrumAccentBackgroundClassName(
        logColor.colorIndex
      )
    : 'bg-primary';

  const accentTextClassName = shouldUseLogAccent
    ? spectrumClassNames.getSpectrumAccentTextClassName(logColor.colorIndex)
    : 'text-primary';

  const logColorClassName = shouldUseLogAccent
    ? spectrumClassNames.getSpectrumBackgroundClassName(logColor.colorIndex)
    : undefined;

  const logColorInteractiveClassName = shouldUseLogAccent
    ? spectrumClassNames.getSpectrumInteractiveBackgroundClassName(
        logColor.colorIndex
      )
    : undefined;

  const myRole = useMyRole({ teamId: recordTeamId ?? null });

  const canCheckRecordTags =
    (!isCopy || isSingleTargetCopy) && !myRole.isLoading && !myRole.canManage;

  const recordTags = useHasRecordTagsForLog({
    enabled: canCheckRecordTags,
    logId: recordLogId,
    teamId: recordTeamId,
  });

  const currentText = record?.text ?? '';

  const shouldReplayRecordDraftIdentity =
    isEditingLocalRecord ||
    (isCreate && localEntry.needsIdentityReplay(record));

  const recordDraftUpdateFields = React.useMemo(
    () =>
      shouldReplayRecordDraftIdentity
        ? {
            authorId: profile.id,
            date: record?.date,
            logId: recordLogId,
            teamId: recordTeamId,
          }
        : {},
    [
      profile.id,
      record?.date,
      recordLogId,
      recordTeamId,
      shouldReplayRecordDraftIdentity,
    ]
  );

  const canUpdateServerDraft =
    !shouldReplayRecordDraftIdentity && networkReachability === true;

  const updateServerRecordDraft = React.useCallback(
    (input: Parameters<typeof updateRecordDraft>[0]) => {
      if (!canUpdateServerDraft) return;
      void updateRecordDraft(input).catch(() => undefined);
    },
    [canUpdateServerDraft]
  );

  const draftParent = React.useMemo(
    () =>
      recordId
        ? { parentId: recordId, parentType: 'record' as const }
        : undefined,
    [recordId]
  );

  const queuedDraft = outboxHooks.useQueuedDraft(draftParent);

  const queuedRecordDraft =
    queuedDraft?.type === 'record' ? queuedDraft : undefined;

  const queuedRecordDate =
    queuedRecordDraft?.recordDateUpdated === true
      ? queuedRecordDraft.recordDate
      : undefined;

  const currentRecordDate = recordTime.normalizeRecordDate(record?.date);

  const selectedRecordDate = isEdit
    ? (recordDateOverride ?? currentRecordDate)
    : (queuedRecordDate ?? recordDateOverride);

  const isScheduledRecordEdit =
    isEdit && recordStatus.recordIsScheduled(record ?? {});

  const isPublishedRecordEdit =
    isEdit && !!record && recordStatus.recordIsPublished(record);

  const isUnpublishedRecordEdit =
    isEdit && !!record && recordStatus.recordIsUnpublished(record);

  const isFutureSelectedRecordDate = recordTime.isFutureRecordDate(
    selectedRecordDate,
    recordDatePreviewNow
  );

  const isSchedulingRecord = !isEdit && isFutureSelectedRecordDate;

  React.useEffect(() => {
    if (!isOpen || !selectedRecordDate) return;
    setRecordDatePreviewNow(Date.now());

    const interval = setInterval(() => {
      setRecordDatePreviewNow(Date.now());
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, [isOpen, selectedRecordDate]);

  const recordDatePreviewLabel = React.useMemo(() => {
    if (!selectedRecordDate) return undefined;
    const date = new Date(selectedRecordDate);

    return Number.isNaN(date.getTime())
      ? undefined
      : formatDate(date, { now: recordDatePreviewNow });
  }, [recordDatePreviewNow, selectedRecordDate]);

  const recordTimeResetKey = isOpen
    ? [
        isEdit ? 'edit' : isCopy ? 'copy' : 'create',
        recordId ?? '',
        isEdit ? (currentRecordDate ?? '') : (queuedRecordDate ?? ''),
      ].join(':')
    : 'closed';

  React.useEffect(() => {
    if (recordTimeResetKeyRef.current === recordTimeResetKey) return;
    recordTimeResetKeyRef.current = recordTimeResetKey;
    setRecordDateOverride(isEdit ? currentRecordDate : queuedRecordDate);
  }, [currentRecordDate, isEdit, queuedRecordDate, recordTimeResetKey]);

  React.useEffect(() => {
    if (!isOpen) setIsRecordTimeSheetOpen(false);
  }, [isOpen]);

  const queuedRecordAttachments = React.useMemo(
    () =>
      recordId
        ? outboxStore.getQueuedAttachmentsForParent(outbox, {
            parentId: recordId,
            parentType: 'record',
            recordId,
          })
        : [],
    [outbox, recordId]
  );

  const isRecordStatusDraft =
    recordStatus.getOptionalRecordStatus(record) === 'draft';

  const shouldUseQueuedRecordDraft =
    (isRecordStatusDraft && !isScheduledRecordEdit) || isEditingLocalRecord;

  const links = React.useMemo(
    () =>
      shouldUseQueuedRecordDraft && queuedRecordDraft?.linksUpdated
        ? queuedRecordDraft.links
        : (record?.links ?? []),
    [
      queuedRecordDraft?.links,
      queuedRecordDraft?.linksUpdated,
      record?.links,
      shouldUseQueuedRecordDraft,
    ]
  );

  const selectedRecordTags = React.useMemo(
    () =>
      shouldUseQueuedRecordDraft && queuedRecordDraft?.tagsUpdated
        ? queuedRecordDraft.tags
        : (record?.tags ?? []),
    [
      queuedRecordDraft?.tags,
      queuedRecordDraft?.tagsUpdated,
      record?.tags,
      shouldUseQueuedRecordDraft,
    ]
  );

  const tagDefinitions = useTags({
    enabled: !!recordLogId && !!recordTeamId,
    logId: recordLogId,
    teamIds: recordTeamId ? [recordTeamId] : undefined,
    type: 'record',
  });

  const selectedTags = React.useMemo(() => {
    if (tagDefinitions.isLoading) return selectedRecordTags;
    const tagsById = new Map(tagDefinitions.data.map((tag) => [tag.id, tag]));

    return selectedRecordTags.flatMap((tag) => {
      const tagDefinition = tagsById.get(tag.id);
      return tagDefinition ? [tagDefinition] : [];
    });
  }, [selectedRecordTags, tagDefinitions.data, tagDefinitions.isLoading]);

  const copyTextResetTargetKey = copyTargetLogIds.join('\u0000');

  const { displayText, latestTextRef, setLatestText } =
    composerTextSession.useComposerTextSession({
      getOpenResetKey: (openSessionKey) => {
        if (isEdit) return `edit:${editRecordId ?? ''}`;

        if (isCopy) {
          return `copy:${copyDraftRecordId ?? ''}:${copyTextResetTargetKey}`;
        }

        return `create:${logId ?? ''}:${recordId ?? ''}:${openSessionKey}`;
      },
      isOpen,
      text: currentText,
    });

  const handleChangeText = composerTextSession.useComposerDraftTextChange({
    contentId: recordId,
    isEdit,
    isEditingLocalEntry: isEditingLocalRecord,
    setLatestText,
    updateLocalSubmissionText: (contentId, nextText) => {
      outboxStore.updateQueuedSubmission(`record:${contentId}`, (submission) =>
        submission.type === 'record' ? { text: nextText } : {}
      );
    },
    updateServerDraftText: (nextText) => {
      updateServerRecordDraft({
        ...recordDraftUpdateFields,
        id: recordId,
        text: nextText,
      });
    },
  });

  const applyTemplateDraft = React.useCallback(
    ({ template, text }: { template: LogTemplate; text: string }) => {
      setLatestText(text);

      if (isEdit) {
        if (recordId) {
          updateServerRecordDraft({
            ...recordDraftUpdateFields,
            id: recordId,
            text,
          });
        }

        return;
      }

      updateServerRecordDraft({
        ...recordDraftUpdateFields,
        id: recordId,
        tagIds: template.tags?.map((tag) => tag.id) ?? [],
        text,
      });

      if (recordId) {
        for (const tag of template.tags ?? []) {
          outboxStore.updateQueuedDraftRecordTagSelection({
            recordId,
            selected: true,
            tag,
            tagId: tag.id,
          });
        }
      }
    },
    [
      isEdit,
      recordDraftUpdateFields,
      recordId,
      setLatestText,
      updateServerRecordDraft,
    ]
  );

  const handleApplyTemplate = React.useCallback(
    (template: LogTemplate) => {
      if (latestTextRef.current.trim()) return;
      applyTemplateDraft({ template, text: template.text });
    },
    [applyTemplateDraft, latestTextRef]
  );

  const handleApplyStructuredTemplate = React.useCallback(
    async ({
      attachments,
      template,
      text,
    }: {
      attachments: RecordTemplateAttachment[];
      template: LogTemplate;
      text: string;
    }) => {
      if (latestTextRef.current.trim()) return;
      if (!recordId || !recordLogId) return;

      const fileAttachments = attachments.filter(
        (
          attachment
        ): attachment is Exclude<RecordTemplateAttachment, { type: 'link' }> =>
          attachment.type !== 'link'
      );

      const linkAttachments = attachments.filter(
        (
          attachment
        ): attachment is Extract<RecordTemplateAttachment, { type: 'link' }> =>
          attachment.type === 'link'
      );

      await runSubmit(async ({ keepPendingUntilClose }) => {
        const parent = {
          parentId: recordId,
          parentType: 'record' as const,
          recordId,
        };

        const queuedTemplateAttachmentIds: string[] = [];

        try {
          const baseAttachmentOrder =
            queuedAttachmentUtils.getNextAttachmentOrder({
              files: record?.files,
              queuedAttachments: queuedRecordAttachments,
            });

          for (const [index, attachment] of fileAttachments.entries()) {
            const fileId = id();
            const order = baseAttachmentOrder + index;

            if (attachment.type === 'file') {
              await outboxHooks.queuePickedAttachment({
                ...parent,
                asset: attachment.asset,
                fileId,
                order,
              });

              queuedTemplateAttachmentIds.push(fileId);
              continue;
            }

            await outboxHooks.queueAudioAttachment({
              ...parent,
              audioUri: attachment.uri,
              duration: attachment.duration,
              fileId,
              order,
            });

            queuedTemplateAttachmentIds.push(fileId);
          }

          const baseLinkOrder = getNextLinkOrder(links);

          const templateLinks = recordTeamId
            ? linkAttachments.map((attachment, index) => ({
                id: id(),
                label: attachment.label,
                localStatus: 'pending' as const,
                order: baseLinkOrder + index,
                teamId: recordTeamId,
                url: attachment.url,
              }))
            : [];

          const nextIsPinned = shouldUseQueuedRecordDraft
            ? (queuedRecordDraft?.isPinned ??
              composerPayloads.getRecordIsPinned(record))
            : composerPayloads.getRecordIsPinned(record);

          outboxHooks.queueSubmission({
            authorId: profile.id,
            contentId: recordId,
            files: record?.files ?? [],
            isPinned: nextIsPinned,
            links: [
              ...links.map(queuedLinks.toQueuedLinkSnapshot),
              ...templateLinks,
            ],
            logId: recordLogId,
            needsDraftReplay: true,
            recordDate: selectedRecordDate,
            tags: queuedTags.toQueuedTagSnapshots(
              mergeTagsById(selectedTags, template.tags)
            ),
            teamId: recordTeamId,
            text,
            type: 'record',
          });
        } catch (error) {
          await Promise.allSettled(
            queuedTemplateAttachmentIds.map((fileId) =>
              outboxHooks.removeQueuedAttachment(fileId)
            )
          );

          throw error;
        }

        outboxStore.rememberSubmittedRecordDraftId(recordId);

        outboxStore.clearQueuedDraft({
          parentId: recordId,
          parentType: 'record',
        });

        void outboxSyncCore.runOutboxSync();
        setLatestText('');
        ignoreDraftId(recordId);

        requestPostSubmitScroll({
          id: recordLogId,
          scope: 'log',
          target: 'top',
        });

        sheetManager.close('record-create');
        setIsTextareaFocused(false);
        keepPendingUntilClose();
      });
    },
    [
      ignoreDraftId,
      latestTextRef,
      links,
      profile.id,
      queuedRecordAttachments,
      queuedRecordDraft?.isPinned,
      record,
      recordId,
      recordLogId,
      recordTeamId,
      runSubmit,
      selectedRecordDate,
      selectedTags,
      setLatestText,
      sheetManager,
      shouldUseQueuedRecordDraft,
    ]
  );

  const {
    handleDeleteFile,
    handleRenameFile,
    handleReorderFiles,
    handleUploadFile,
  } = useComposerFileCallbacks({
    onDeleteFile: React.useCallback(
      async (fileId: string) => {
        await deleteRecordFile({ fileId, recordId });
      },
      [recordId]
    ),
    onUploadFile: React.useCallback(
      async (asset, fileId, order) => {
        await uploadRecordFile({ asset, fileId, order, recordId });
      },
      [recordId]
    ),
  });

  const handleReorderLinks = useComposerLinkReorder({
    shouldReorderQueuedDraftLinks: shouldUseQueuedRecordDraft,
    shouldReorderQueuedLinks: isEditingLocalRecord,
  });

  const attachmentParent = React.useMemo<RecordSheetParent | undefined>(
    () =>
      recordId
        ? {
            id: recordId,
            teamId: recordTeamId,
            type: 'record',
            usesQueuedDraftLinks: isRecordStatusDraft && !isScheduledRecordEdit,
          }
        : undefined,
    [isRecordStatusDraft, isScheduledRecordEdit, recordId, recordTeamId]
  );

  const { linkAttachmentCount, linkAttachmentMenuItem, linkPreview } =
    useComposerLinkAttachments({
      links,
      onReorderLinks: handleReorderLinks,
      parent: attachmentParent,
    });

  const handleOpenTags = React.useCallback(() => {
    if (!recordId) return;
    blurActiveTextInput();

    requestAnimationFrame(() =>
      sheetManager.open('record-tags', recordId, undefined, {
        authorId: profile.id,
        logId: recordLogId,
        tags: selectedTags,
        teamId: recordTeamId,
      })
    );
  }, [
    profile.id,
    recordId,
    recordLogId,
    recordTeamId,
    selectedTags,
    sheetManager,
  ]);

  const handleOpenRecordTime = React.useCallback(() => {
    blurActiveTextInput();
    setIsRecordTimeSheetOpen(true);
  }, []);

  const handleChangeRecordDate = React.useCallback(
    (nextDate?: string) => {
      if (
        isPublishedRecordEdit &&
        recordTime.isFutureRecordDate(nextDate, Date.now())
      ) {
        return;
      }

      setRecordDateOverride(nextDate);
      if (!recordId) return;

      if (isScheduledRecordEdit) {
        if (!nextDate) return;

        void updateScheduledRecordSchedule({
          date: nextDate,
          id: recordId,
          text: latestTextRef.current.trim(),
        }).catch(() => undefined);

        return;
      }

      if (isEdit) {
        if (!nextDate) return;

        if (isEditingLocalRecord) {
          outboxStore.updateQueuedRecordDate({
            recordDate: nextDate,
            recordId,
          });

          return;
        }

        void db
          .transact(db.tx.records[recordId].update({ date: nextDate }))
          .catch(() => undefined);

        return;
      }

      if (shouldUseQueuedRecordDraft) {
        outboxStore.updateQueuedDraftRecordDate({
          recordDate: nextDate,
          recordId,
        });
      }
    },
    [
      isEdit,
      isEditingLocalRecord,
      isPublishedRecordEdit,
      isScheduledRecordEdit,
      latestTextRef,
      recordId,
      shouldUseQueuedRecordDraft,
    ]
  );

  const hasSelectedTags = selectedTags.some((tag) => !!tag.id);

  const canOpenTags =
    (!isCopy || isSingleTargetCopy) &&
    !!recordId &&
    (!!myRole.canManage || recordTags.hasRecordTags || hasSelectedTags);

  const isTagsDisabled = false;
  const canToggleCopyPin = !isCopy || isSingleTargetCopy;

  const isPinned = shouldUseQueuedRecordDraft
    ? (queuedRecordDraft?.isPinned ??
      composerPayloads.getRecordIsPinned(record))
    : composerPayloads.getRecordIsPinned(record);

  const canTogglePin = canToggleCopyPin && !!recordId && myRole.canPinRecords;
  const isPinDisabled = false;

  const handleTogglePin = React.useCallback(() => {
    if (!recordId) return;
    if (isPinDisabled) return;

    if (shouldUseQueuedRecordDraft) {
      outboxStore.updateQueuedDraftRecordPin({ isPinned: !isPinned, recordId });
      return;
    }

    if (isEditingLocalRecord) {
      outboxStore.updateQueuedRecordPin({ isPinned: !isPinned, recordId });
      return;
    }

    void toggleRecordPin({ id: recordId, isPinned: !isPinned });
  }, [
    isEditingLocalRecord,
    isPinDisabled,
    isPinned,
    recordId,
    shouldUseQueuedRecordDraft,
  ]);

  const tagToolbarItem = canOpenTags
    ? createComposerToolbarIconButton({
        activeClassName: accentTextClassName,
        disabled: isTagsDisabled,
        icon: Tag,
        isActive: hasSelectedTags,
        onPress: handleOpenTags,
      })
    : null;

  const pinToolbarItem = canTogglePin
    ? createComposerToolbarIconButton({
        accessibilityLabel: isPinned ? 'Unpin record' : 'Pin record',
        activeClassName: accentTextClassName,
        disabled: isPinDisabled,
        icon: PushPin,
        isActive: isPinned,
        onPress: handleTogglePin,
      })
    : null;

  const recordTimeToolbarItem = recordId
    ? React.createElement(recordTimeSheet2.RecordTimeButton, {
        disabled: false,
        iconClassName: accentTextClassName,
        isCustom: isFutureSelectedRecordDate,
        onPress: handleOpenRecordTime,
      })
    : null;

  const recordTimeSheet = React.createElement(
    recordTimeSheet2.RecordTimeSheet,
    {
      accentColor,
      accentColorClassName,
      canUseSubmissionTime: !isEdit,
      maxDate: isPublishedRecordEdit ? recordDatePreviewNow : undefined,
      onChange: handleChangeRecordDate,
      onClose: () => setIsRecordTimeSheetOpen(false),
      open: isOpen && isRecordTimeSheetOpen,
      resetToNow: !isEdit || (isUnpublishedRecordEdit && !isEditingLocalRecord),
      value: selectedRecordDate,
    }
  );

  const { isBusy, fileCount, filePreview, toolbar } = useFileComposer({
    extraAttachmentCount: linkAttachmentCount,
    extraAttachmentMenuItems: linkAttachmentMenuItem,
    extraPreview: linkPreview,
    extraToolbarItems: React.createElement(
      React.Fragment,
      null,
      recordTimeToolbarItem,
      tagToolbarItem,
      pinToolbarItem
    ),
    isOpen,
    files: record?.files ?? [],
    onDeleteFile: handleDeleteFile,
    deferQueuedUploads:
      shouldReplayRecordDraftIdentity ||
      (!isEdit && networkReachability !== true),
    onOpenAudio: () => sheetManager.open('record-audio', recordId, 'record'),
    onRenameFile: handleRenameFile,
    onReorderFiles: handleReorderFiles,
    onUploadFile: handleUploadFile,
    recordId,
  });

  const hasContent = !!displayText.trim() || fileCount > 0;

  const canSubmitForm =
    isServerRecordEdit ||
    isEdit ||
    (hasContent && (!isCopy || copyTargetLogIds.length > 0));

  const closeSheet = React.useCallback(() => {
    sheetManager.close('record-create');
    setIsTextareaFocused(false);
  }, [sheetManager]);

  const closeCopyFlow = React.useCallback(() => {
    if (sheetManager.isOpen('record-copy-to')) {
      sheetManager.close('record-copy-to');
    } else {
      sheetManager.close('record-create');
    }

    setIsTextareaFocused(false);
  }, [sheetManager]);

  const handleDismiss = React.useCallback(() => {
    if (!isCopy) {
      closeSheet();
      return;
    }

    const cleanupRecordId = recordId ?? copyDraftRecordId;
    if (isSubmittingRef.current) return;
    closeSheet();
    if (!cleanupRecordId) return;
    ignoreDraftId(cleanupRecordId);
    if (cleanupDraftIdsRef.current.has(cleanupRecordId)) return;
    cleanupDraftIdsRef.current.add(cleanupRecordId);

    const cleanupCopyDraft = async () => {
      try {
        await deleteRecord({ id: cleanupRecordId });
      } catch (error) {
        console.error('Failed to clean up copy draft', error);
      } finally {
        cleanupDraftIdsRef.current.delete(cleanupRecordId);
      }
    };

    void cleanupCopyDraft();
  }, [
    closeSheet,
    copyDraftRecordId,
    ignoreDraftId,
    isCopy,
    isSubmittingRef,
    recordId,
  ]);

  const handleSubmit = React.useCallback(async () => {
    const text = latestTextRef.current.trim();

    if (
      isBusy ||
      (!isEdit && !text && fileCount === 0) ||
      !recordId ||
      (isCopy && copyTargetLogIds.length === 0)
    ) {
      return;
    }

    if (isEdit) {
      if (isScheduledRecordEdit) {
        closeSheet();
        return;
      }

      if (!isEditingLocalRecord) {
        if (queuedRecordAttachments.length > 0 && recordLogId) {
          outboxHooks.queueSubmission({
            authorId: profile.id,
            contentId: recordId,
            files: record?.files ?? [],
            isPinned,
            links: links.map(queuedLinks.toQueuedLinkSnapshot),
            logId: recordLogId,
            needsDraftReplay: false,
            recordDate: selectedRecordDate,
            tags: queuedTags.toQueuedTagSnapshots(selectedTags),
            teamId: recordTeamId,
            text,
            type: 'record',
          });

          outboxStore.clearQueuedDraft({
            parentId: recordId,
            parentType: 'record',
          });

          void outboxSyncCore.runOutboxSync();
        }

        closeSheet();
        return;
      }

      outboxStore.updateQueuedSubmission(`record:${recordId}`, (submission) =>
        submission.type === 'record'
          ? {
              isPinned,
              links: links.map(queuedLinks.toQueuedLinkSnapshot),
              tagIds: selectedTags.map((tag) => tag.id),
              tags: queuedTags.toQueuedTagSnapshots(selectedTags),
              text,
            }
          : {}
      );

      outboxStore.clearQueuedDraft({
        parentId: recordId,
        parentType: 'record',
      });

      closeSheet();
      return;
    }

    await runSubmit(async ({ keepPendingUntilClose }) => {
      if (isCopy) {
        if (canUpdateServerDraft) {
          await updateRecordDraft({
            ...recordDraftUpdateFields,
            id: recordId,
            text,
          });
        }

        await finalizeRecordCopy({
          date: selectedRecordDate,
          id: recordId,
          logIds: copyTargetLogIds,
        });

        ignoreDraftId(recordId);

        for (const targetLogId of copyTargetLogIds) {
          requestPostSubmitScroll({
            id: targetLogId,
            scope: 'log',
            target: 'top',
          });
        }

        closeCopyFlow();
        keepPendingUntilClose();
        return;
      }

      if (!recordLogId) return;

      outboxHooks.queueSubmission({
        authorId: profile.id,
        contentId: recordId,
        files: record?.files ?? [],
        isPinned,
        links: links.map(queuedLinks.toQueuedLinkSnapshot),
        logId: recordLogId,
        needsDraftReplay: true,
        recordDate: selectedRecordDate,
        tags: queuedTags.toQueuedTagSnapshots(selectedTags),
        teamId: recordTeamId,
        text,
        type: 'record',
      });

      outboxStore.rememberSubmittedRecordDraftId(recordId);

      outboxStore.clearQueuedDraft({
        parentId: recordId,
        parentType: 'record',
      });

      void outboxSyncCore.runOutboxSync();
      setLatestText('');
      ignoreDraftId(recordId);
      requestPostSubmitScroll({ id: recordLogId, scope: 'log', target: 'top' });
      closeSheet();
      keepPendingUntilClose();
    });
  }, [
    closeCopyFlow,
    closeSheet,
    canUpdateServerDraft,
    copyTargetLogIds,
    ignoreDraftId,
    isCopy,
    isEdit,
    isEditingLocalRecord,
    isScheduledRecordEdit,
    isBusy,
    latestTextRef,
    fileCount,
    profile.id,
    queuedRecordAttachments.length,
    recordDraftUpdateFields,
    recordId,
    recordLogId,
    recordTeamId,
    record?.files,
    runSubmit,
    selectedRecordDate,
    setLatestText,
    selectedTags,
    isPinned,
    links,
  ]);

  return {
    currentText: displayText,
    hasContent: canSubmitForm,
    canOpenTemplates:
      isCreate && templates.data.length > 0 && !displayText.trim(),
    canOpenTags,
    canTogglePin,
    isPinDisabled,
    isTagsDisabled,
    isBusy,
    isOpen,
    isPinned,
    isSubmitting,
    isTextInputDisabled: false,
    isTextareaFocused,
    loading: isEdit
      ? !editRecord
      : isCopy
        ? copyLoading || !copyDraft
        : !outbox.hydrated || (!!logId && !draft.id),
    logColorClassName: isEdit ? undefined : logColorClassName,
    logColorInteractiveClassName: isEdit
      ? undefined
      : logColorInteractiveClassName,
    fileCount,
    filePreview,
    onChangeText: handleChangeText,
    onDismiss: handleDismiss,
    onApplyTemplate: handleApplyTemplate,
    onApplyStructuredTemplate: handleApplyStructuredTemplate,
    onSubmit: handleSubmit,
    onOpenRecordTime: handleOpenRecordTime,
    onOpenTags: handleOpenTags,
    onTextareaFocusChange: setIsTextareaFocused,
    onTogglePin: handleTogglePin,
    recordTimeSheet,
    recordDatePreviewClassName: isFutureSelectedRecordDate
      ? accentTextClassName
      : undefined,
    recordDatePreviewLabel,
    selectedTags,
    showFormattingControls: myRole.canManage,
    submitLabel: isEdit ? 'Done' : isSchedulingRecord ? 'Schedule' : 'Record',
    submitVariant: isEdit ? ('secondary' as const) : undefined,
    templates: isCreate ? templates.data : [],
    toolbar,
  };
};
