import { visibleFileQuery } from '@/domain/files/query';
import { useFileComposer } from '@/features/files/hooks/use-composer';
import type { PickedFileAsset } from '@/features/files/lib/picked';
import { reorderFiles } from '@/features/files/mutations/reorder-files';
import { updateDocumentName } from '@/features/files/mutations/update-document-name';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { useLogTemplates } from '@/features/logs/queries/use-templates';
import type { LogTemplate } from '@/features/logs/types/template';
import { useConnectivity } from '@/features/offline/connectivity';
import * as localEntry from '@/features/offline/local-entry';
import * as outboxStore from '@/features/offline/outbox-store';
import * as pendingEntries from '@/features/offline/pending-entries';
import * as queuedLinks from '@/features/offline/queued-links';
import * as queuedTags from '@/features/offline/queued-tags';
import { useProfile } from '@/features/account/queries/use-profile';
import { useComposerLatestText } from '@/features/records/hooks/use-composer-latest-text';
import { useComposerLinkAttachments } from '@/features/records/hooks/use-composer-link-attachments';
import { useIgnoredDraftIds } from '@/features/records/hooks/use-ignored-draft-ids';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import type { RecordSheetParent } from '@/features/records/lib/sheet-payloads';
import { deleteRecord } from '@/features/records/mutations/delete-record';
import { deleteRecordFile } from '@/features/records/mutations/delete-record-file';
import { finalizeRecordCopy } from '@/features/records/mutations/finalize-record-copy';
import { reorderLinks } from '@/features/records/mutations/reorder-links';
import { toggleRecordPin } from '@/features/records/mutations/toggle-pin';
import { updateRecordDraft } from '@/features/records/mutations/update-record-draft';
import { uploadRecordFile } from '@/features/records/mutations/upload-record-file';
import { useHasRecordTagsForLog } from '@/features/records/queries/use-has-record-tags-for-log';
import { useRecordDraft } from '@/features/records/queries/use-record-draft';
import { useTags } from '@/features/tags/queries/use-tags';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { blurActiveTextInput } from '@/lib/blur-active-text-input';
import { db } from '@/lib/db';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { PushPin, Tag } from 'phosphor-react-native';
import * as React from 'react';
import * as outboxHooks from '@/features/offline/outbox-hooks';

const getCopyTargetLogIds = (payload: unknown) => {
  if (!payload || typeof payload !== 'object' || !('logIds' in payload)) {
    return [];
  }

  const logIds = (payload as { logIds?: unknown }).logIds;
  if (!Array.isArray(logIds)) return [];

  return [
    ...new Set(
      logIds
        .filter((logId): logId is string => typeof logId === 'string')
        .map((logId) => logId.trim())
        .filter(Boolean)
    ),
  ];
};

const getPayloadTeamId = (payload: unknown) => {
  if (!payload || typeof payload !== 'object' || !('teamId' in payload)) return;
  const teamId = (payload as { teamId?: unknown }).teamId;
  return typeof teamId === 'string' && teamId.trim() ? teamId : undefined;
};

const getRecordIsPinned = (value: unknown) =>
  !!(
    value &&
    typeof value === 'object' &&
    'isPinned' in value &&
    (value as { isPinned?: unknown }).isPinned
  );

export const useRecordComposerModel = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isTextareaFocused, setIsTextareaFocused] = React.useState(false);
  const { ignoreDraftId, ignoredDraftIds } = useIgnoredDraftIds();
  const cleanupDraftIdsRef = React.useRef(new Set<string>());
  const isSubmittingRef = React.useRef(false);
  const sheetManager = useSheetManager();
  const profile = useProfile();
  const connectivity = useConnectivity();
  const outbox = outboxHooks.useOutbox();
  const context = sheetManager.getContext('record-create');
  const isEdit = context === 'edit';
  const isCopy = context === 'copy';
  const isCreate = !isEdit && !isCopy;
  const isOpen = sheetManager.isOpen('record-create');
  const sheetId = sheetManager.getId('record-create');
  const colorScheme = useColorScheme();

  const copyPayload = isCopy
    ? sheetManager.getPayload('record-create')
    : undefined;

  const createPayload = isCreate
    ? sheetManager.getPayload('record-create')
    : undefined;

  const createTeamId = getPayloadTeamId(createPayload);

  const copyTargetLogIds = React.useMemo(
    () => getCopyTargetLogIds(copyPayload),
    [copyPayload]
  );

  const isSingleTargetCopy = isCopy && copyTargetLogIds.length === 1;
  const logId = isEdit || isCopy ? undefined : sheetId;
  const draftLogId = isCreate && outbox.hydrated ? logId : undefined;
  const editRecordId = isEdit ? sheetId : undefined;
  const copyDraftRecordId = isCopy ? sheetId : undefined;

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

  const areServerEditActionsDisabled =
    isServerRecordEdit && !connectivity.canRunNetworkActions;

  const recordLogId = isEdit
    ? editRecord?.log?.id
    : isCopy
      ? copyTargetLogIds[0]
      : logId;

  const recordTeamId = record?.teamId ?? createTeamId;
  const logColor = useLogColor({ id: recordLogId });
  const accentColor = logColor[colorScheme === 'dark' ? 'lighter' : 'darker'];
  const myRole = useMyRole({ teamId: recordTeamId });

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

  const shouldUseQueuedRecordDraft = !!record?.isDraft || isEditingLocalRecord;
  const copyTextResetTargetKey = copyTargetLogIds.join('\u0000');

  const composerTextResetKey = React.useMemo(() => {
    if (!isOpen) return 'closed';
    if (isEdit) return `edit:${editRecordId ?? ''}`;

    if (isCopy) {
      return `copy:${copyDraftRecordId ?? ''}:${copyTextResetTargetKey}`;
    }

    return `create:${logId ?? ''}`;
  }, [
    copyDraftRecordId,
    copyTextResetTargetKey,
    editRecordId,
    isCopy,
    isEdit,
    isOpen,
    logId,
  ]);

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
    if (!tagDefinitions.data.length) return selectedRecordTags;
    const tagsById = new Map(tagDefinitions.data.map((tag) => [tag.id, tag]));
    return selectedRecordTags.map((tag) => tagsById.get(tag.id) ?? tag);
  }, [tagDefinitions.data, selectedRecordTags]);

  const { displayText, latestTextRef, setLatestText } = useComposerLatestText({
    resetKey: composerTextResetKey,
    text: currentText,
  });

  const handleChangeText = React.useCallback(
    (nextText: string) => {
      if (areServerEditActionsDisabled) return;
      setLatestText(nextText);

      if (isEdit) {
        if (recordId) {
          if (!connectivity.canRunNetworkActions) return;

          void updateRecordDraft({
            ...recordDraftUpdateFields,
            id: recordId,
            text: nextText,
          });
        }

        return;
      }

      if (!connectivity.canRunNetworkActions) return;

      void updateRecordDraft({
        ...recordDraftUpdateFields,
        id: recordId,
        text: nextText,
      });
    },
    [
      areServerEditActionsDisabled,
      connectivity.canRunNetworkActions,
      isEdit,
      recordDraftUpdateFields,
      recordId,
      setLatestText,
    ]
  );

  const handleApplyTemplate = React.useCallback(
    (template: LogTemplate) => {
      if (areServerEditActionsDisabled) return;
      if (latestTextRef.current.trim()) return;
      const text = template.text;
      setLatestText(text);

      if (isEdit) {
        if (recordId) {
          if (!connectivity.canRunNetworkActions) return;

          void updateRecordDraft({
            ...recordDraftUpdateFields,
            id: recordId,
            text,
          });
        }

        return;
      }

      if (!connectivity.canRunNetworkActions) return;

      void updateRecordDraft({
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
      areServerEditActionsDisabled,
      connectivity.canRunNetworkActions,
      isEdit,
      latestTextRef,
      recordDraftUpdateFields,
      recordId,
      setLatestText,
    ]
  );

  const handleUploadFile = React.useCallback(
    async (asset: PickedFileAsset, fileId: string, order: number) => {
      await uploadRecordFile({ asset, fileId, order, recordId });
    },
    [recordId]
  );

  const handleDeleteFile = React.useCallback(
    async (fileId: string) => {
      await deleteRecordFile({ fileId, recordId });
    },
    [recordId]
  );

  const handleRenameFile = React.useCallback(
    async (fileId: string, name: string) => {
      await updateDocumentName({ id: fileId, name });
    },
    []
  );

  const handleReorderFiles = React.useCallback((files: { id: string }[]) => {
    void reorderFiles(files);
  }, []);

  const handleReorderLinks = React.useCallback(
    (links: { id: string }[]) => {
      const orderedIds = links.map((link) => link.id);

      if (shouldUseQueuedRecordDraft) {
        outboxStore.reorderQueuedDraftLinks(orderedIds);
      }

      if (isEditingLocalRecord) outboxStore.reorderQueuedLinks(orderedIds);
      void reorderLinks(links);
    },
    [isEditingLocalRecord, shouldUseQueuedRecordDraft]
  );

  const attachmentParent = React.useMemo<RecordSheetParent | undefined>(
    () =>
      recordId
        ? { id: recordId, teamId: recordTeamId, type: 'record' }
        : undefined,
    [recordId, recordTeamId]
  );

  const { linkAttachmentCount, linkPreview, linkToolbarItems } =
    useComposerLinkAttachments({
      actionsDisabled: areServerEditActionsDisabled,
      links,
      onReorderLinks: handleReorderLinks,
      parent: attachmentParent,
    });

  const handleOpenTags = React.useCallback(() => {
    if (!recordId) return;
    if (!connectivity.canRunNetworkActions) return;
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
    connectivity.canRunNetworkActions,
  ]);

  const canOpenTags =
    (!isCopy || isSingleTargetCopy) &&
    !!recordId &&
    (!!myRole.canManage || recordTags.hasRecordTags);

  const isTagsDisabled = !connectivity.canRunNetworkActions;
  const canToggleCopyPin = !isCopy || isSingleTargetCopy;

  const isPinned = shouldUseQueuedRecordDraft
    ? (queuedRecordDraft?.isPinned ?? getRecordIsPinned(record))
    : getRecordIsPinned(record);

  const canTogglePin = canToggleCopyPin && !!recordId && myRole.canPinRecords;
  const isPinDisabled = !connectivity.canRunNetworkActions;

  const handleTogglePin = React.useCallback(() => {
    if (!recordId) return;
    if (isPinDisabled) return;

    if (shouldUseQueuedRecordDraft) {
      outboxStore.updateQueuedDraftRecordPin({ isPinned: !isPinned, recordId });
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
    ? React.createElement(
        Button,
        {
          disabled: isTagsDisabled,
          onPress: handleOpenTags,
          size: 'icon-xs',
          variant: 'secondary',
        },
        React.createElement(Icon, { icon: Tag })
      )
    : null;

  const pinToolbarItem = canTogglePin
    ? React.createElement(
        Button,
        {
          accessibilityLabel: isPinned ? 'Unpin record' : 'Pin record',
          accessibilityState: { selected: isPinned },
          disabled: isPinDisabled,
          onPress: handleTogglePin,
          size: 'icon-xs',
          variant: 'secondary',
        },
        React.createElement(Icon, {
          color: isPinned ? accentColor : undefined,
          icon: PushPin,
          weight: isPinned ? 'fill' : 'regular',
        })
      )
    : null;

  const { isBusy, fileCount, filePreview, toolbar } = useFileComposer({
    actionsDisabled: areServerEditActionsDisabled,
    extraAttachmentCount: linkAttachmentCount,
    extraPreview: linkPreview,
    extraToolbarItems: React.createElement(
      React.Fragment,
      null,
      linkToolbarItems,
      tagToolbarItem,
      pinToolbarItem
    ),
    isOpen,
    files: record?.files ?? [],
    onDeleteFile: handleDeleteFile,
    deferQueuedUploads: shouldReplayRecordDraftIdentity,
    onOpenAudio: () => sheetManager.open('record-audio', recordId, 'record'),
    onRenameFile: handleRenameFile,
    onReorderFiles: handleReorderFiles,
    onUploadFile: handleUploadFile,
    recordId,
  });

  const hasContent = !!displayText.trim() || fileCount > 0;

  const canSubmitForm =
    isServerRecordEdit ||
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
  }, [closeSheet, copyDraftRecordId, ignoreDraftId, isCopy, recordId]);

  const handleSubmit = React.useCallback(async () => {
    const text = latestTextRef.current.trim();

    if (isServerRecordEdit) {
      closeSheet();
      return;
    }

    if (
      isBusy ||
      (!text && fileCount === 0) ||
      !recordId ||
      (isCopy && copyTargetLogIds.length === 0)
    ) {
      return;
    }

    if (isEdit) {
      if (!isEditingLocalRecord) {
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

      const updateLocalRecordDraft = async () => {
        try {
          await updateRecordDraft({
            ...recordDraftUpdateFields,
            id: recordId,
            text,
          });
        } catch (error) {
          console.error('Failed to update local record draft', error);
        }
      };

      void updateLocalRecordDraft();
      closeSheet();
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      if (connectivity.canRunNetworkActions) {
        await updateRecordDraft({
          ...recordDraftUpdateFields,
          id: recordId,
          text,
        });
      }

      if (isCopy) {
        await finalizeRecordCopy({ id: recordId, logIds: copyTargetLogIds });
        ignoreDraftId(recordId);

        for (const targetLogId of copyTargetLogIds) {
          requestPostSubmitScroll({
            id: targetLogId,
            scope: 'log',
            target: 'top',
          });
        }

        closeCopyFlow();
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
        tags: queuedTags.toQueuedTagSnapshots(selectedTags),
        teamId: recordTeamId,
        text,
        type: 'record',
      });

      outboxStore.clearQueuedDraft({
        parentId: recordId,
        parentType: 'record',
      });

      ignoreDraftId(recordId);
      requestPostSubmitScroll({ id: recordLogId, scope: 'log', target: 'top' });
      closeSheet();
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    closeCopyFlow,
    closeSheet,
    connectivity.canRunNetworkActions,
    copyTargetLogIds,
    ignoreDraftId,
    isCopy,
    isEdit,
    isEditingLocalRecord,
    isServerRecordEdit,
    isBusy,
    latestTextRef,
    fileCount,
    profile.id,
    recordDraftUpdateFields,
    recordId,
    recordLogId,
    recordTeamId,
    record?.files,
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
    isTextInputDisabled: areServerEditActionsDisabled,
    isTextareaFocused,
    loading: isEdit
      ? !editRecord
      : isCopy
        ? copyLoading || !copyDraft
        : !outbox.hydrated || (!!logId && !draft.id),
    logColor: isEdit || isCopy ? undefined : logColor.default,
    fileCount,
    filePreview,
    onChangeText: handleChangeText,
    onDismiss: handleDismiss,
    onApplyTemplate: handleApplyTemplate,
    onSubmit: handleSubmit,
    onOpenTags: handleOpenTags,
    onTextareaFocusChange: setIsTextareaFocused,
    onTogglePin: handleTogglePin,
    selectedTags,
    submitLabel: isEdit ? 'Done' : 'Record',
    submitVariant: isEdit ? ('secondary' as const) : undefined,
    templates: isCreate ? templates.data : [],
    toolbar,
  };
};
