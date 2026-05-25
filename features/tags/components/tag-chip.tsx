import { cn } from '@/lib/cn';
import { getSpectrumBackgroundClassName } from '@/theme/spectrum-class-names';
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
        {showColorAccent && (
          <View
            className={cn(
              'size-2.5 rounded-full shrink-0',
              getSpectrumBackgroundClassName(color)
            )}
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
