import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Microphone } from 'phosphor-react-native/lib/module/icons/Microphone';
import { ActivityIndicator, View } from 'react-native';

export const RecordAudioSheetContent = ({
  canSave,
  duration,
  isMicActive,
  isUploading,
  logColor,
  onCancel,
  onSave,
  startError,
}: {
  canSave: boolean;
  duration: number;
  isMicActive: boolean;
  isUploading: boolean;
  logColor?: string | null;
  onCancel: () => void;
  onSave: () => void;
  startError?: string | null;
}) => {
  return (
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
          className="web:hover:opacity-90 active:opacity-90"
          disabled={isUploading || !canSave}
          onPress={onSave}
          style={logColor ? { backgroundColor: logColor } : undefined}
        >
          {isUploading ? (
            <ActivityIndicator
              color={UI.light.contrastForeground}
              size="small"
            />
          ) : (
            <Text>Save</Text>
          )}
        </Button>
        <Button disabled={isUploading} onPress={onCancel} variant="secondary">
          <Text>Cancel</Text>
        </Button>
      </View>
    </View>
  );
};
