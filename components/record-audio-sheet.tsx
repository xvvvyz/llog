import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useLogColor } from '@/hooks/use-log-color';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { uploadRecordMedia } from '@/mutations/upload-record-media';
import { uploadReplyMedia } from '@/mutations/upload-reply-media';
import { useRecord } from '@/queries/use-record';
import { formatTime } from '@/utilities/format-time';
import { Microphone } from 'phosphor-react-native/lib/module/icons/Microphone';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

type AudioContext = { type: 'record' } | { type: 'reply'; recordId: string };

const parseAudioContext = (context?: string): AudioContext => {
  if (context?.startsWith('reply:')) {
    return { type: 'reply', recordId: context.slice(6) };
  }

  return { type: 'record' };
};

export const RecordAudioSheet = () => {
  const [isUploading, startUploadTransition] = React.useTransition();
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

  const record = useRecord({
    id: audioContext.type === 'reply' ? audioContext.recordId : draftId,
  });

  const logColor = useLogColor({ id: record.log?.id });

  React.useEffect(() => {
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

  const close = React.useCallback(() => {
    sheetManager.close('record-audio');
  }, [sheetManager]);

  const handleCancel = React.useCallback(async () => {
    isClosingRef.current = true;
    if (recorder.isRecording) await recorder.stop();
    recorder.reset();
    close();
  }, [close, recorder]);

  React.useEffect(() => {
    if (isOpen && recorder.hasPermission === false) {
      close();
    }
  }, [isOpen, recorder.hasPermission, close]);

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

  const handleSave = React.useCallback(async () => {
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
