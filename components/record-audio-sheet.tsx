import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { useAudioRecorderHook } from '@/hooks/use-audio-recorder';
import { useLogColor } from '@/hooks/use-log-color';
import { uploadCommentMedia } from '@/mutations/upload-comment-media';
import { uploadRecordMedia } from '@/mutations/upload-record-media';
import { useRecord } from '@/queries/use-record';
import { formatTime } from '@/utilities/format-time';
import { Microphone } from 'phosphor-react-native';
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
  const recorder = useAudioRecorderHook();

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

  const handleGrantPermission = useCallback(async () => {
    await recorder.requestPermission();
  }, [recorder]);

  const upload = useCallback(async () => {
    let uri = recorder.uri;

    if (recorder.isRecording) {
      uri = await recorder.stop();
    }

    if (!uri || !draftId) return;
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
  }, [audioContext, draftId, recorder]);

  const handleSave = useCallback(async () => {
    startUploadTransition(async () => {
      await upload();
      close();
    });
  }, [close, startUploadTransition, upload]);

  return (
    <Sheet onDismiss={handleCancel} open={isOpen} portalName="record-audio">
      {recorder.hasPermission === false ? (
        <View className="mx-auto w-full max-w-md p-8">
          <Icon
            className="-mb-2 self-center text-primary"
            icon={Microphone}
            size={64}
          />
          <Text className="mt-8 text-center text-muted-foreground">
            Allow microphone access{'\n'}to record audio.
          </Text>
          <Button
            className="text-white web:hover:opacity-90"
            onPress={handleGrantPermission}
            style={{ backgroundColor: logColor.default }}
            wrapperClassName="mt-12"
          >
            <Text>Continue</Text>
          </Button>
          <Button
            onPress={handleCancel}
            variant="secondary"
            wrapperClassName="mt-3"
          >
            <Text>Cancel</Text>
          </Button>
        </View>
      ) : (
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
      )}
    </Sheet>
  );
};
