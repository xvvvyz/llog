import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useLogColor } from '@/hooks/use-log-color';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { uploadRecordMedia } from '@/mutations/upload-record-media';
import { uploadReplyMedia } from '@/mutations/upload-reply-media';
import { useRecord } from '@/queries/use-record';
import { cn } from '@/utilities/cn';
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
    if (isUploading) return;

    isClosingRef.current = true;
    setIsUploading(true);

    try {
      let uri = recorder.uri;

      if (recorder.isRecording) {
        uri = await recorder.stop();
      }

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
      <View className="mx-auto w-full max-w-sm gap-12 p-8">
        <View className="items-center gap-4">
          <View
            className={cn(
              'size-16 items-center justify-center rounded-full border',
              isMicActive
                ? 'border-destructive/20 bg-destructive/10'
                : 'border-border-secondary bg-secondary'
            )}
          >
            <Icon
              className={
                isMicActive ? 'text-destructive' : 'text-muted-foreground'
              }
              icon={Microphone}
              size={28}
              weight="fill"
            />
          </View>
          <Text className="text-2xl font-medium tabular-nums">
            {formatTime(duration)}
          </Text>
          {startError ? (
            <Text className="text-muted-foreground text-center text-sm">
              {startError}
            </Text>
          ) : null}
        </View>
        <View className="gap-3">
          <Button
            className="web:hover:opacity-90 text-white active:opacity-90"
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
