import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { SPECTRUM, isColor } from '@/theme/spectrum';
import { Text } from '@/ui/text';
import { View } from 'react-native';

export const TagChip = ({
  color,
  className,
  fallbackAccentColor,
  name,
  showColorAccent = false,
  textClassName,
}: {
  color?: number | null;
  className?: string;
  fallbackAccentColor?: string;
  name: string;
  showColorAccent?: boolean;
  textClassName?: string;
}) => {
  const colorScheme = useColorScheme();

  const accentColor = isColor(color)
    ? SPECTRUM[colorScheme][color].default
    : fallbackAccentColor;

  return (
    <View
      className={cn(
        'max-w-full min-w-0 flex-row items-center gap-1.5 rounded-full bg-secondary px-1.5 py-0.5 border-continuous',
        className
      )}
    >
      {showColorAccent && accentColor ? (
        <View
          className="size-2.5 rounded-full shrink-0"
          style={{ backgroundColor: accentColor }}
        />
      ) : null}
      <Text
        numberOfLines={1}
        className={cn(
          'shrink font-normal text-muted-foreground text-xs',
          textClassName
        )}
      >
        {name}
      </Text>
    </View>
  );
};
