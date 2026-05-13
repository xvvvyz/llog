import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { SPECTRUM, resolveSpectrumColor } from '@/theme/spectrum';
import { Text } from '@/ui/text';
import * as React from 'react';
import { Pressable, View } from 'react-native';

type TagChipProps = React.ComponentPropsWithoutRef<typeof Pressable> & {
  color?: number;
  className?: string;
  name: string;
  showColorAccent?: boolean;
  textClassName?: string;
};

export const TagChip = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  TagChipProps
>(
  (
    {
      color,
      className,
      disabled,
      name,
      onPress,
      showColorAccent = false,
      textClassName,
      ...props
    },
    ref
  ) => {
    const colorScheme = useColorScheme();

    const accentColor = showColorAccent
      ? SPECTRUM[colorScheme][resolveSpectrumColor(color)].default
      : undefined;

    return (
      <Pressable
        ref={ref}
        accessibilityRole={onPress ? 'button' : undefined}
        disabled={disabled}
        hitSlop={4}
        onPress={onPress}
        className={cn(
          'max-w-full min-w-0 flex-row items-center gap-1.5 rounded-full bg-secondary px-1.5 py-0.5 border-continuous',
          onPress && 'active:opacity-80',
          className
        )}
        {...props}
      >
        {showColorAccent && !!accentColor && (
          <View
            className="size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: accentColor }}
          />
        )}
        <Text
          numberOfLines={1}
          className={cn(
            'shrink font-normal text-muted-foreground text-xs',
            textClassName
          )}
        >
          {name}
        </Text>
      </Pressable>
    );
  }
);

TagChip.displayName = 'TagChip';
