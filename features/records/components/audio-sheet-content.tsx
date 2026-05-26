import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Microphone } from 'phosphor-react-native';
import { View } from 'react-native';

export const AudioSheetContent = ({
  activeMicBackgroundClassName,
  activeMicBorderClassName,
  activeMicIconClassName,
  canSave,
  duration,
  isMicActive,
  isUploading,
  logColorClassName,
  logColorInteractiveClassName,
  onCancel,
  onSave,
  startError,
}: {
  activeMicBackgroundClassName: string;
  activeMicBorderClassName: string;
  activeMicIconClassName: string;
  canSave: boolean;
  duration: number;
  isMicActive: boolean;
  isUploading: boolean;
  logColorClassName?: string;
  logColorInteractiveClassName?: string;
  onCancel: () => void;
  onSave: () => void;
  startError?: string | null;
}) => {
  return (
    <View className="mx-auto max-w-sm w-full pb-4 pt-8 px-8 gap-12 md:p-8">
      <View className="gap-4 items-center">
        <View
          className={cn(
            'relative size-16 items-center justify-center overflow-hidden rounded-full border border-continuous',
            isMicActive
              ? 'border-transparent'
              : 'border-border-secondary bg-secondary'
          )}
        >
          {isMicActive && (
            <>
              <View
                className={cn(
                  'absolute inset-0 rounded-full opacity-10',
                  activeMicBackgroundClassName
                )}
              />
              <View
                className={cn(
                  'absolute inset-0 rounded-full border border-continuous opacity-20',
                  activeMicBorderClassName
                )}
              />
            </>
          )}
          <Icon
            icon={Microphone}
            size={28}
            weight="fill"
            className={
              isMicActive ? activeMicIconClassName : 'text-muted-foreground'
            }
          />
        </View>
        <Text className="font-medium text-2xl tabular-nums">
          {formatTime(duration)}
        </Text>
        {!!startError && (
          <Text className="text-center text-muted-foreground text-sm">
            {startError}
          </Text>
        )}
      </View>
      <View className="gap-3">
        <Button
          className={logColorClassName}
          disabled={isUploading || !canSave}
          onPress={onSave}
          size="sm"
          interactiveClassName={
            logColorInteractiveClassName
              ? cn(
                  'active:opacity-90 web:hover:opacity-90',
                  logColorInteractiveClassName
                )
              : undefined
          }
        >
          {isUploading ? <Spinner /> : <Text>Save</Text>}
        </Button>
        <Button
          disabled={isUploading}
          onPress={onCancel}
          size="sm"
          variant="secondary"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </View>
  );
};
