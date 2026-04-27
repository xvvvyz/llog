import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Microphone } from 'phosphor-react-native';
import { View } from 'react-native';

export const AudioSheetContent = ({
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
    <View className="mx-auto max-w-sm w-full p-8 gap-12">
      <View className="gap-4 items-center">
        <View
          className={cn(
            'size-16 items-center justify-center rounded-full border',
            isMicActive
              ? 'border-destructive/20 bg-destructive/10'
              : 'border-border-secondary bg-secondary'
          )}
        >
          <Icon
            icon={Microphone}
            size={28}
            weight="fill"
            className={
              isMicActive ? 'text-destructive' : 'text-muted-foreground'
            }
          />
        </View>
        <Text className="font-medium text-2xl tabular-nums">
          {formatTime(duration)}
        </Text>
        {startError ? (
          <Text className="text-center text-muted-foreground text-sm">
            {startError}
          </Text>
        ) : null}
      </View>
      <View className="gap-3">
        <Button
          className="active:opacity-90 web:hover:opacity-90"
          disabled={isUploading || !canSave}
          onPress={onSave}
          style={logColor ? { backgroundColor: logColor } : undefined}
        >
          {isUploading ? (
            <Spinner color={UI.light.contrastForeground} />
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
