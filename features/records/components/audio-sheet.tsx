import { useLogColor } from '@/features/logs/hooks/use-color';
import * as outbox from '@/features/offline/outbox-hooks';
import * as queuedAttachmentUtils from '@/features/files/lib/queued-attachments';
import { AudioSheetContent } from '@/features/records/components/audio-sheet-content';
import { useAudioRecorder } from '@/features/records/hooks/use-audio-recorder';
import { uploadRecordFile } from '@/features/records/mutations/upload-record-file';
import { uploadReplyFile } from '@/features/records/mutations/upload-reply-file';
import { useRecord } from '@/features/records/queries/use-record';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { alert } from '@/lib/alert';
import { durationSecondsToMs } from '@/lib/duration';
import { Sheet } from '@/ui/sheet';
import { id } from '@instantdb/react-native';
import * as React from 'react';
import * as existingUpload from '@/features/files/lib/existing-upload';

type AudioContext = { type: 'record' } | { type: 'reply'; recordId: string };

const parseAudioContext = (context?: string): AudioContext => {
  if (context?.startsWith('reply:')) {
    return { type: 'reply', recordId: context.slice(6) };
  }

  return { type: 'record' };
};

export const RecordAudioSheet = () => {
  const [isUploading, setIsUploading] = React.useState(false);
  const sheetManager = useSheetManager();
  const recorder = useAudioRecorder();
  const draftId = sheetManager.getId('record-audio');
  const rawContext = sheetManager.getContext('record-audio');

  const audioContext = React.useMemo(
    () => parseAudioContext(rawContext),
    [rawContext]
  );

  const isOpen = sheetManager.isOpen('record-audio');
  const isClosingRef = React.useRef(false);

  const {
    duration,
    hasPermission,
    isRecording,
    record: startRecording,
    startError,
    uri,
  } = recorder;

  const record = useRecord({
    id: audioContext.type === 'reply' ? audioContext.recordId : draftId,
  });

  const outboxSnapshot = outbox.useOutbox();

  const audioParent = React.useMemo(
    () =>
      draftId
        ? {
            parentId: draftId,
            parentType: audioContext.type,
            recordId:
              audioContext.type === 'reply' ? audioContext.recordId : draftId,
          }
        : undefined,
    [audioContext, draftId]
  );

  const queuedAttachments = React.useMemo(
    () =>
      queuedAttachmentUtils.getQueuedAttachmentsForParent(
        outboxSnapshot.attachments,
        audioParent
      ),
    [audioParent, outboxSnapshot.attachments]
  );

  const existingFiles = React.useMemo(
    () =>
      audioContext.type === 'reply'
        ? (record.replies.find((reply) => reply.id === draftId)?.files ?? [])
        : record.files,
    [audioContext.type, draftId, record.files, record.replies]
  );

  const canUploadQueuedAudioNow = React.useMemo(() => {
    if (!draftId) return false;

    if (audioContext.type === 'reply') {
      const reply = record.replies.find((reply) => reply.id === draftId);
      return !!reply?.id && !reply.localStatus;
    }

    return record.id === draftId && !record.localStatus;
  }, [
    audioContext.type,
    draftId,
    record.id,
    record.localStatus,
    record.replies,
  ]);

  const logColor = useLogColor({ id: record.log?.id });
  const saveColor = record.log?.id ? logColor.default : undefined;
  const isMicActive = isRecording && !isUploading;

  React.useEffect(() => {
    if (!isOpen) {
      isClosingRef.current = false;
      return;
    }

    if (
      !isClosingRef.current &&
      hasPermission !== false &&
      duration === 0 &&
      !startError &&
      !isRecording &&
      !uri
    ) {
      void startRecording();
    }
  }, [
    duration,
    hasPermission,
    isOpen,
    isRecording,
    startError,
    startRecording,
    uri,
  ]);

  const close = React.useCallback(() => {
    sheetManager.close('record-audio');
  }, [sheetManager]);

  const handleCancel = React.useCallback(async () => {
    if (isUploading) return;
    isClosingRef.current = true;

    try {
      if (recorder.isRecording) await recorder.stop();
    } finally {
      recorder.reset();
      close();
    }
  }, [close, isUploading, recorder]);

  React.useEffect(() => {
    if (isOpen && hasPermission === false) {
      isClosingRef.current = true;
      recorder.reset();
      close();
    }
  }, [close, hasPermission, isOpen, recorder]);

  const uploadQueuedAudio = React.useCallback(
    async ({
      duration,
      fileId,
      localUri,
      order,
    }: {
      duration?: number;
      fileId: string;
      localUri: string;
      order: number;
    }) => {
      const parent = audioParent;
      if (!parent) return;
      outbox.setQueuedAttachmentStatus(fileId, 'uploading');

      const markUploaded = async (
        uploadedFile?: Awaited<
          ReturnType<typeof existingUpload.getExistingFileForQueuedParent>
        >
      ) => {
        let file = uploadedFile;

        if (!file) {
          try {
            file = await existingUpload.getExistingFileForQueuedParent({
              fileId,
              parent,
            });
          } catch {
            // The file snapshot is best-effort; the outbox can still complete.
          }
        }

        outbox.markQueuedAttachmentUploaded(fileId, file);
        return true;
      };

      try {
        const existingFile =
          await existingUpload.getExistingFileForQueuedParent({
            fileId,
            parent,
          });

        if (existingFile?.id) return await markUploaded(existingFile);

        if (audioContext.type === 'reply') {
          await uploadReplyFile({
            audioUri: localUri,
            replyId: draftId,
            duration,
            fileId,
            order,
            recordId: audioContext.recordId,
          });
        } else {
          await uploadRecordFile({
            audioUri: localUri,
            duration,
            fileId,
            order,
            recordId: draftId,
          });
        }

        return await markUploaded();
      } catch (error) {
        if (existingUpload.isExistingFileIdError(error)) {
          const existingFile =
            await existingUpload.getExistingFileForQueuedParent({
              fileId,
              parent,
            });

          if (existingFile?.id) return await markUploaded(existingFile);
        }

        outbox.setQueuedAttachmentStatus(
          fileId,
          'error',
          error instanceof Error ? error.message : 'Failed to upload audio.'
        );

        return false;
      }
    },
    [audioContext, audioParent, draftId]
  );

  const queueAudio = React.useCallback(
    async (uri: string) => {
      if (!draftId) return;
      const duration = durationSecondsToMs(recorder.duration);
      const fileId = id();

      const order = queuedAttachmentUtils.getNextAttachmentOrder({
        files: existingFiles,
        queuedAttachments,
      });

      let queued: Awaited<ReturnType<typeof outbox.queueAudioAttachment>>;

      try {
        queued = await outbox.queueAudioAttachment({
          audioUri: uri,
          duration,
          fileId,
          order,
          parentId: draftId,
          parentType: audioContext.type,
          persistBinary: true,
          recordId:
            audioContext.type === 'reply' ? audioContext.recordId : draftId,
        });
      } catch {
        if (!canUploadQueuedAudioNow) {
          throw new Error('This recording could not be saved for upload.');
        }

        queued = await outbox.queueAudioAttachment({
          audioUri: uri,
          duration,
          fileId,
          order,
          parentId: draftId,
          parentType: audioContext.type,
          persistBinary: false,
          recordId:
            audioContext.type === 'reply' ? audioContext.recordId : draftId,
        });

        const uploaded = await uploadQueuedAudio({
          duration,
          fileId,
          localUri: queued.localUri,
          order,
        });

        if (!uploaded) {
          await outbox.removeQueuedAttachment(fileId);
          throw new Error('This recording could not be uploaded.');
        }

        recorder.reset();
        return;
      }

      if (canUploadQueuedAudioNow) {
        void uploadQueuedAudio({
          duration,
          fileId,
          localUri: queued.localUri,
          order,
        });
      }

      recorder.reset();
    },
    [
      audioContext,
      canUploadQueuedAudioNow,
      draftId,
      existingFiles,
      queuedAttachments,
      recorder,
      uploadQueuedAudio,
    ]
  );

  const handleSave = React.useCallback(async () => {
    if (isUploading) return;
    isClosingRef.current = true;
    setIsUploading(true);

    try {
      let uri = recorder.uri;
      if (recorder.isRecording) uri = await recorder.stop();

      if (!uri) {
        isClosingRef.current = false;
        return;
      }

      await queueAudio(uri);
      close();
    } catch (error) {
      isClosingRef.current = false;

      alert({
        message:
          error instanceof Error
            ? error.message
            : 'This recording could not be saved.',
        title: 'Recording not saved',
      });
    } finally {
      setIsUploading(false);
    }
  }, [close, isUploading, queueAudio, recorder]);

  return (
    <Sheet
      className="md:max-w-sm"
      onDismiss={handleCancel}
      open={isOpen}
      portalName="record-audio"
    >
      <AudioSheetContent
        canSave={!!recorder.isRecording || !!recorder.uri}
        duration={duration}
        isMicActive={isMicActive}
        isUploading={isUploading}
        logColor={saveColor}
        onCancel={handleCancel}
        onSave={handleSave}
        startError={startError}
      />
    </Sheet>
  );
};
