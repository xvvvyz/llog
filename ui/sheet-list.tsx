import { cn } from '@/lib/cn';
import { useSheetScrollHandler } from '@/ui/sheet-drag-context';
import { Spinner } from '@/ui/spinner';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import * as sheetScrollStyle from '@/ui/sheet-scroll-style';

type SheetListScrollViewProps = React.ComponentPropsWithoutRef<
  typeof ScrollView
> &
  sheetScrollStyle.SheetScrollContentVariantProps & {
    className?: string;
    contentContainerClassName?: string;
    loading?: boolean;
  };

export const SheetListScrollView = React.forwardRef<
  React.ComponentRef<typeof ScrollView>,
  SheetListScrollViewProps
>(
  (
    {
      className,
      children,
      contentContainerClassName,
      keyboardDismissMode = 'on-drag',
      keyboardShouldPersistTaps = 'always',
      loading,
      onScroll,
      showsVerticalScrollIndicator = false,
      scrollEventThrottle = 16,
      style,
      variant,
      ...props
    },
    ref
  ) => {
    const handleScroll = useSheetScrollHandler(onScroll);

    return (
      <ScrollView
        ref={ref}
        className={cn(sheetScrollStyle.SHEET_SCROLL_VIEW_CLASS_NAME, className)}
        keyboardDismissMode={keyboardDismissMode}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        style={style}
        contentContainerClassName={cn(
          sheetScrollStyle.sheetScrollContentVariants({ variant }),
          contentContainerClassName,
          'relative',
          loading && 'min-h-24'
        )}
        {...props}
      >
        {children}
        {loading && (
          <View className="absolute inset-0 z-10 min-h-24 bg-popover/80 items-center justify-center">
            <Spinner />
          </View>
        )}
      </ScrollView>
    );
  }
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
