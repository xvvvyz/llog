import { useRippleColor } from '@/hooks/use-ripple-color';
import { blurActiveTextInput } from '@/lib/blur-active-text-input';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Text, TextContext } from '@/ui/text';
import * as React from 'react';
import { Pressable, View, type GestureResponderEvent } from 'react-native';

type ScrollSheetMenuContextValue = { close: () => void };

const ScrollSheetMenuContext =
  React.createContext<ScrollSheetMenuContextValue | null>(null);

type RootProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  contentContainerClassName?: string;
  portalName: string;
  topInset?: number;
  trigger: (props: { isOpen: boolean; open: () => void }) => React.ReactNode;
};

const Root = ({
  children,
  className,
  contentClassName,
  contentContainerClassName,
  portalName,
  topInset,
  trigger,
}: RootProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const close = React.useCallback(() => setIsOpen(false), []);

  const open = React.useCallback(() => {
    blurActiveTextInput();
    setIsOpen(true);
  }, []);

  const context = React.useMemo(() => ({ close }), [close]);

  return (
    <>
      {trigger({ isOpen, open })}
      <Sheet
        className={className}
        onDismiss={close}
        open={isOpen}
        portalName={portalName}
        topInset={topInset}
        variant="list"
        width="narrow"
      >
        <ScrollSheetMenuContext.Provider value={context}>
          <SheetListScrollView
            className={contentClassName}
            contentContainerClassName={contentContainerClassName}
            variant="flush"
          >
            <TextContext.Provider value="text-popover-foreground">
              {children}
            </TextContext.Provider>
          </SheetListScrollView>
          <SheetFooter contentClassName="max-w-md">
            <Button onPress={close} size="sm" variant="secondary">
              <Text>Close</Text>
            </Button>
          </SheetFooter>
        </ScrollSheetMenuContext.Provider>
      </Sheet>
    </>
  );
};

type ItemProps = Omit<
  React.ComponentPropsWithoutRef<typeof Pressable>,
  'children'
> & { children: React.ReactNode; closeOnPress?: boolean };

const Item = React.forwardRef<React.ComponentRef<typeof Pressable>, ItemProps>(
  (
    { children, className, closeOnPress = true, disabled, onPress, ...props },
    ref
  ) => {
    const rippleColor = useRippleColor('inverse');
    const menu = React.useContext(ScrollSheetMenuContext);
    const isDisabled = !!disabled;

    const handlePress = React.useCallback(
      (event: GestureResponderEvent) => {
        if (isDisabled) return;
        if (closeOnPress) menu?.close();
        onPress?.(event);
      },
      [closeOnPress, isDisabled, menu, onPress]
    );

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        android_ripple={{ color: rippleColor }}
        disabled={isDisabled}
        onPress={handlePress}
        className={cn(
          'android:active:bg-transparent web:cursor-default web:outline-hidden flex w-full',
          !isDisabled && 'active:bg-accent web:hover:bg-accent',
          isDisabled && 'opacity-50',
          className
        )}
        {...props}
      >
        <View className="flex-row mx-auto max-w-md min-h-11 w-full px-8 py-2.5 gap-4 items-center md:px-4">
          {children}
        </View>
      </Pressable>
    );
  }
);

Item.displayName = 'ScrollSheetMenuItem';
const Separator = () => <View className="my-2 border-border border-t" />;
const useContext = () => React.useContext(ScrollSheetMenuContext);

export { Item, Root, Separator, useContext };
