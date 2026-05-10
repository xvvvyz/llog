import { visibleFileQuery } from '@/domain/files/query';
import { useFileComposer } from '@/features/files/hooks/use-composer';
import type { PickedFileAsset } from '@/features/files/lib/picked';
import { reorderFiles } from '@/features/files/mutations/reorder-files';
import { updateDocumentName } from '@/features/files/mutations/update-document-name';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { useLogTemplates } from '@/features/logs/queries/use-templates';
import { useComposerLatestText } from '@/features/records/hooks/use-composer-latest-text';
import { useComposerLinkAttachments } from '@/features/records/hooks/use-composer-link-attachments';
import { useIgnoredDraftIds } from '@/features/records/hooks/use-ignored-draft-ids';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import type { RecordSheetParent } from '@/features/records/lib/sheet-payloads';
import { deleteRecord } from '@/features/records/mutations/delete-record';
import { deleteRecordFile } from '@/features/records/mutations/delete-record-file';
import { finalizeRecordCopy } from '@/features/records/mutations/finalize-record-copy';
import { publishRecord } from '@/features/records/mutations/publish-record';
import { reorderLinks } from '@/features/records/mutations/reorder-links';
import { updateRecordDraft } from '@/features/records/mutations/update-record-draft';
import { uploadRecordFile } from '@/features/records/mutations/upload-record-file';
import { useHasRecordTagsForLog } from '@/features/records/queries/use-has-record-tags-for-log';
import { useRecordDraft } from '@/features/records/queries/use-record-draft';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Tag } from 'phosphor-react-native';
import * as React from 'react';

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

export const useRecordComposerModel = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isTextareaFocused, setIsTextareaFocused] = React.useState(false);
  const { ignoreDraftId, ignoredDraftIds } = useIgnoredDraftIds();
  const cleanupDraftIdsRef = React.useRef(new Set<string>());
  const isSubmittingRef = React.useRef(false);
  const sheetManager = useSheetManager();
  const context = sheetManager.getContext('record-create');
  const isEdit = context === 'edit';
  const isCopy = context === 'copy';
  const isCreate = !isEdit && !isCopy;
  const isOpen = sheetManager.isOpen('record-create');
  const sheetId = sheetManager.getId('record-create');

  const copyPayload = isCopy
    ? sheetManager.getPayload('record-create')
    : undefined;

  const copyTargetLogIds = React.useMemo(
    () => getCopyTargetLogIds(copyPayload),
    [copyPayload]
  );

  const isSingleTargetCopy = isCopy && copyTargetLogIds.length === 1;
  const logId = isEdit || isCopy ? undefined : sheetId;
  const editRecordId = isEdit ? sheetId : undefined;
  const copyDraftRecordId = isCopy ? sheetId : undefined;
  const draft = useRecordDraft({ ignoredDraftIds, logId });
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
                where: { type: 'record' },
              },
            },
          },
        }
      : null
  );

  const queriedEditRecord = editData?.records?.[0];

  const editRecord =
    queriedEditRecord?.id === editRecordId ? queriedEditRecord : undefined;

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

  const recordLogId = isEdit
    ? editRecord?.log?.id
    : isCopy
      ? copyTargetLogIds[0]
      : logId;

  const recordTeamId = record?.teamId;
  const logColor = useLogColor({ id: recordLogId });
  const myRole = useMyRole({ teamId: recordTeamId });

  const recordTags = useHasRecordTagsForLog({
    enabled: (!isCopy || isSingleTargetCopy) && !myRole.canManage,
    logId: recordLogId,
    teamId: recordTeamId,
  });

  const currentText = record?.text ?? '';
  const links = record?.links ?? [];

  const { latestTextRef, setLatestText } = useComposerLatestText({
    isTextareaFocused,
    text: currentText,
  });

  const handleChangeText = React.useCallback(
    (nextText: string) => {
      setLatestText(nextText);

      if (isEdit) {
        if (recordId) {
          void db.transact(db.tx.records[recordId].update({ text: nextText }));
        }

        return;
      }

      void updateRecordDraft({ id: recordId, text: nextText });
    },
    [isEdit, recordId, setLatestText]
  );

  const handleApplyTemplate = React.useCallback(
    (templateText: string) => {
      if (latestTextRef.current.trim()) return;
      handleChangeText(templateText);
    },
    [handleChangeText, latestTextRef]
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

  const handleReorderLinks = React.useCallback((links: { id: string }[]) => {
    void reorderLinks(links);
  }, []);

  const attachmentParent = React.useMemo<RecordSheetParent | undefined>(
    () => (recordId ? { id: recordId, type: 'record' } : undefined),
    [recordId]
  );

  const { linkAttachmentCount, linkPreview, linkToolbarItems } =
    useComposerLinkAttachments({
      links,
      onReorderLinks: handleReorderLinks,
      parent: attachmentParent,
    });

  const handleOpenTags = React.useCallback(() => {
    if (!recordId) return;

    sheetManager.open('record-tags', recordId, undefined, {
      logId: recordLogId,
    });
  }, [recordId, recordLogId, sheetManager]);

  const canOpenTags =
    (!isCopy || isSingleTargetCopy) &&
    !!recordId &&
    (!!myRole.canManage || recordTags.hasRecordTags);

  const tagToolbarItem = canOpenTags
    ? React.createElement(
        Button,
        { onPress: handleOpenTags, size: 'icon-xs', variant: 'secondary' },
        React.createElement(Icon, { icon: Tag })
      )
    : null;

  const { isBusy, fileCount, filePreview, toolbar } = useFileComposer({
    extraAttachmentCount: linkAttachmentCount,
    extraPreview: linkPreview,
    extraToolbarItems: React.createElement(
      React.Fragment,
      null,
      linkToolbarItems,
      tagToolbarItem
    ),
    isOpen,
    files: record?.files ?? [],
    onDeleteFile: handleDeleteFile,
    onOpenAudio: () => sheetManager.open('record-audio', recordId, 'record'),
    onRenameFile: handleRenameFile,
    onReorderFiles: handleReorderFiles,
    onUploadFile: handleUploadFile,
    recordId,
  });

  const hasContent = !!currentText.trim() || fileCount > 0;

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

    void deleteRecord({ id: cleanupRecordId })
      .catch((error) => {
        console.error('Failed to clean up copy draft', error);
      })
      .finally(() => {
        cleanupDraftIdsRef.current.delete(cleanupRecordId);
      });
  }, [closeSheet, copyDraftRecordId, ignoreDraftId, isCopy, recordId]);

  const handleSubmit = React.useCallback(async () => {
    const text = latestTextRef.current.trim();

    if (
      isBusy ||
      (!text && fileCount === 0) ||
      !recordId ||
      (isCopy && copyTargetLogIds.length === 0)
    ) {
      return;
    }

    if (isEdit) {
      await db.transact(db.tx.records[recordId].update({ text }));
      closeSheet();
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await updateRecordDraft({ id: recordId, text });

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

      await publishRecord({ id: recordId });
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
    copyTargetLogIds,
    ignoreDraftId,
    isCopy,
    isEdit,
    isBusy,
    latestTextRef,
    fileCount,
    recordId,
    recordLogId,
  ]);

  return {
    currentText,
    hasContent: hasContent && (!isCopy || copyTargetLogIds.length > 0),
    canOpenTemplates:
      isCreate && templates.data.length > 0 && !currentText.trim(),
    isBusy,
    isOpen,
    isSubmitting,
    isTextareaFocused,
    loading: isEdit
      ? !editRecord
      : isCopy
        ? copyLoading || !copyDraft
        : !!logId && !draft.id,
    logColor: isCopy ? undefined : logColor.default,
    fileCount,
    filePreview,
    onChangeText: handleChangeText,
    onDismiss: handleDismiss,
    onApplyTemplate: handleApplyTemplate,
    onSubmit: handleSubmit,
    onTextareaFocusChange: setIsTextareaFocused,
    selectedTags: record?.tags ?? [],
    submitLabel: isEdit ? 'Done' : 'Record',
    templates: isCreate ? templates.data : [],
    toolbar,
  };
};
