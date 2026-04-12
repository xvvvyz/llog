import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useLogColor } from '@/hooks/use-log-color';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { uploadCommentMedia } from '@/mutations/upload-comment-media';
import { uploadRecordMedia } from '@/mutations/upload-record-media';
import { useRecord } from '@/queries/use-record';
import { formatTime } from '@/utilities/format-time';
import { Microphone } from 'phosphor-react-native/lib/module/icons/Microphone';
import { useCallback, useEffect, useMemo, useRef, useTransition } from 'react';
import { ActivityIndicator, View } from 'react-native';

type AudioContext = { type: 'record' } | { type: 'comment'; recordId: string };

const parseAudioContext = (context?: string): AudioContext => {
  if (context?.startsWith('comment:')) {
    return { type: 'comment', recordId: context.slice(8) };
  }

  return { type: 'record' };
};

export const RecordAudioSheet = () => {
  const [isUploading, startUploadTransition] = useTransition();
  const sheetManager = useSheetManager();
  const recorder = useAudioRecorder();

  const draftId = sheetManager.getId('record-audio');
  const rawContext = sheetManager.getContext('record-audio');

  const audioContext = useMemo(
    () => parseAudioContext(rawContext),
    [rawContext]
  );

  const isOpen = sheetManager.isOpen('record-audio');
  const isClosingRef = useRef(false);

  const record = useRecord({
    id: audioContext.type === 'comment' ? audioContext.recordId : draftId,
  });

  const logColor = useLogColor({ id: record.log?.id });

  useEffect(() => {
    if (!isOpen) {
      isClosingRef.current = false;
      return;
    }

    if (
      !isClosingRef.current &&
      recorder.hasPermission !== false &&
      !recorder.isRecording &&
      !recorder.uri
    ) {
      recorder.record();
    }
  }, [
    isOpen,
    recorder,
    recorder.hasPermission,
    recorder.isRecording,
    recorder.uri,
    recorder.record,
  ]);

  const close = useCallback(() => {
    sheetManager.close('record-audio');
  }, [sheetManager]);

  const handleCancel = useCallback(async () => {
    isClosingRef.current = true;

    if (recorder.isRecording) {
      await recorder.stop();
    }

    recorder.reset();
    close();
  }, [close, recorder]);

  useEffect(() => {
    if (isOpen && recorder.hasPermission === false) {
      close();
    }
  }, [isOpen, recorder.hasPermission, close]);

  const upload = useCallback(
    async (uri: string) => {
      if (!draftId) return;
      const duration = recorder.duration;

      if (audioContext.type === 'comment') {
        await uploadCommentMedia({
          audioUri: uri,
          commentId: draftId,
          duration,
          recordId: audioContext.recordId,
        });
      } else {
        await uploadRecordMedia({
          audioUri: uri,
          duration,
          recordId: draftId,
        });
      }

      recorder.reset();
    },
    [audioContext, draftId, recorder]
  );

  const handleSave = useCallback(async () => {
    isClosingRef.current = true;
    let uri = recorder.uri;

    if (recorder.isRecording) {
      uri = await recorder.stop();
    }

    if (!uri) return;

    startUploadTransition(async () => {
      await upload(uri);
      close();
    });
  }, [close, recorder, startUploadTransition, upload]);

  return (
    <Sheet onDismiss={handleCancel} open={isOpen} portalName="record-audio">
      <View className="mx-auto w-full max-w-sm gap-12 p-8">
        <View className="items-center gap-4">
          <View className="items-center justify-center">
            <View
              className="absolute rounded-full bg-red-500/10"
              style={{
                width: 64 + recorder.level * 32,
                height: 64 + recorder.level * 32,
              }}
            />
            <View className="size-16 items-center justify-center rounded-full bg-red-500/10">
              <Microphone size={28} color="#ef4444" weight="fill" />
            </View>
          </View>
          <Text className="text-2xl font-medium tabular-nums">
            {formatTime(recorder.duration)}
          </Text>
        </View>
        <View className="gap-3">
          <Button
            className="text-white web:hover:opacity-90"
            disabled={isUploading || (!recorder.isRecording && !recorder.uri)}
            onPress={handleSave}
            style={{ backgroundColor: logColor.default }}
          >
            {isUploading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text>Save</Text>
            )}
          </Button>
          <Button
            disabled={isUploading}
            onPress={handleCancel}
            variant="secondary"
          >
            <Text>Cancel</Text>
          </Button>
        </View>
      </View>
    </Sheet>
  );
};
