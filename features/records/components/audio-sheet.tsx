import { useLogColor } from '@/features/logs/hooks/use-color';
import { AudioSheetContent } from '@/features/records/components/audio-sheet-content';
import { useAudioRecorder } from '@/features/records/hooks/use-audio-recorder';
import { uploadRecordMedia } from '@/features/records/mutations/upload-record-media';
import { uploadReplyMedia } from '@/features/records/mutations/upload-reply-media';
import { useRecord } from '@/features/records/queries/use-record';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Sheet } from '@/ui/sheet';
import * as React from 'react';

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

  const logColor = useLogColor({ id: record.log?.id });
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

  const upload = React.useCallback(
    async (uri: string) => {
      if (!draftId) return;
      const duration = recorder.duration;

      if (audioContext.type === 'reply') {
        await uploadReplyMedia({
          audioUri: uri,
          replyId: draftId,
          duration,
          recordId: audioContext.recordId,
        });
      } else {
        await uploadRecordMedia({ audioUri: uri, duration, recordId: draftId });
      }

      recorder.reset();
    },
    [audioContext, draftId, recorder]
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

      await upload(uri);
      close();
    } catch {
      isClosingRef.current = false;
    } finally {
      setIsUploading(false);
    }
  }, [close, isUploading, recorder, upload]);

  return (
    <Sheet onDismiss={handleCancel} open={isOpen} portalName="record-audio">
      <AudioSheetContent
        canSave={!!recorder.isRecording || !!recorder.uri}
        duration={duration}
        isMicActive={isMicActive}
        isUploading={isUploading}
        logColor={logColor?.default}
        onCancel={handleCancel}
        onSave={handleSave}
        startError={startError}
      />
    </Sheet>
  );
};
