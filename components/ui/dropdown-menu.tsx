import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import { forwardRef, ReactNode } from 'react';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
const Root = DropdownMenuPrimitive.Root;

const Trigger = DropdownMenuPrimitive.Trigger;

const Portal = DropdownMenuPrimitive.Portal;

const Content = forwardRef<
  DropdownMenuPrimitive.ContentRef,
  DropdownMenuPrimitive.ContentProps
>(({ children, className, ...props }, ref) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Overlay className="absolute inset-0">
        <DropdownMenuPrimitive.Content ref={ref} {...props}>
          <Animated.View
            className={cn(
              'min-w-[10rem] overflow-hidden rounded-2xl bg-popover py-1',
              className
            )}
            entering={FadeInUp.duration(100)}
            exiting={FadeOutUp.duration(100)}
            style={{ borderCurve: 'continuous' }}
          >
            {children as ReactNode}
          </Animated.View>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Overlay>
    </DropdownMenuPrimitive.Portal>
  );
});

Content.displayName = DropdownMenuPrimitive.Content.displayName;

const Item = forwardRef<
  DropdownMenuPrimitive.ItemRef,
  DropdownMenuPrimitive.ItemProps & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <TextClassContext.Provider value="select-none text-popover-foreground text-lg">
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        'group relative flex flex-row items-center gap-1 px-5 py-3 active:bg-accent web:cursor-default web:outline-none web:hover:bg-accent web:focus:bg-accent',
        inset && 'pl-8',
        props.disabled && 'opacity-50 web:pointer-events-none',
        className
      )}
      {...props}
    />
  </TextClassContext.Provider>
));

Item.displayName = DropdownMenuPrimitive.Item.displayName;

const Separator = forwardRef<
  DropdownMenuPrimitive.SeparatorRef,
  DropdownMenuPrimitive.SeparatorProps
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
));

Separator.displayName = DropdownMenuPrimitive.Separator.displayName;

export { Content, Item, Portal, Root, Separator, Trigger };
