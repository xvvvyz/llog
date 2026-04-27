import { cn } from '@/lib/cn';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

type SheetListScrollViewProps = React.ComponentPropsWithoutRef<
  typeof ScrollView
> & { className?: string; contentContainerClassName?: string };

export const SheetListScrollView = React.forwardRef<
  React.ComponentRef<typeof ScrollView>,
  SheetListScrollViewProps
>(
  (
    {
      className,
      contentContainerClassName,
      keyboardDismissMode = 'on-drag',
      keyboardShouldPersistTaps = 'always',
      showsVerticalScrollIndicator = false,
      ...props
    },
    ref
  ) => (
    <ScrollView
      ref={ref}
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      className={cn(
        '-mx-px max-h-[19rem] min-h-0 border-b border-border-secondary border-x rounded-b-4xl',
        className
      )}
      contentContainerClassName={cn(
        'mx-auto w-full max-w-lg px-8 py-5',
        contentContainerClassName
      )}
      {...props}
    />
  )
);

SheetListScrollView.displayName = 'SheetListScrollView';

type SheetFooterProps = React.ComponentPropsWithoutRef<typeof View> & {
  className?: string;
  contentClassName?: string;
};

export const SheetFooter = ({
  children,
  className,
  contentClassName,
  ...props
}: SheetFooterProps) => (
  <View className={className} {...props}>
    <View className={cn('mx-auto max-w-lg w-full px-8 py-4', contentClassName)}>
      {children}
    </View>
  </View>
);
