import { cn } from '@/lib/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

const sheetListContentVariants = cva(
  'mx-auto w-full max-w-lg px-8 py-6 md:p-4',
  {
    defaultVariants: { variant: 'default' },
    variants: { variant: { default: '', rows: 'gap-2 py-8' } },
  }
);

type SheetListScrollViewProps = React.ComponentPropsWithoutRef<
  typeof ScrollView
> &
  VariantProps<typeof sheetListContentVariants> & {
    className?: string;
    contentContainerClassName?: string;
  };

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
      style,
      variant,
      ...props
    },
    ref
  ) => (
    <ScrollView
      ref={ref}
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      style={style}
      className={cn(
        '-mx-px max-h-[19rem] min-h-0 border-b border-border-secondary border-x rounded-b-4xl md:rounded-b-3xl border-continuous',
        className
      )}
      contentContainerClassName={cn(
        sheetListContentVariants({ variant }),
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
    <View
      className={cn(
        'mx-auto max-w-lg w-full px-8 py-4 md:p-4',
        contentClassName
      )}
    >
      {children}
    </View>
  </View>
);
