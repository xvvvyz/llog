import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import * as React from 'react';
import * as RN from 'react-native';

const Root = DropdownMenuPrimitive.Root;

const Trigger = DropdownMenuPrimitive.Trigger;

const Portal = DropdownMenuPrimitive.Portal;

const Content = React.forwardRef<
  DropdownMenuPrimitive.ContentRef,
  DropdownMenuPrimitive.ContentProps & {
    overlayStyle?: RN.StyleProp<RN.ViewStyle>;
    overlayClassName?: string;
    portalHost?: string;
  }
>(
  (
    { className, overlayClassName, overlayStyle, portalHost, ...props },
    ref
  ) => {
    const { open } = DropdownMenuPrimitive.useRootContext();
    return (
      <DropdownMenuPrimitive.Portal hostName={portalHost}>
        <DropdownMenuPrimitive.Overlay
          style={
            overlayStyle
              ? RN.StyleSheet.flatten([
                  RN.Platform.OS !== 'web'
                    ? RN.StyleSheet.absoluteFill
                    : undefined,
                  overlayStyle,
                ])
              : RN.Platform.OS !== 'web'
                ? RN.StyleSheet.absoluteFill
                : undefined
          }
          className={overlayClassName}
        >
          <DropdownMenuPrimitive.Content
            ref={ref}
            className={cn(
              'z-50 min-w-[12rem] overflow-hidden rounded-md border border-border bg-popover py-1 web:data-[side=bottom]:slide-in-from-top-2 web:data-[side=left]:slide-in-from-right-2 web:data-[side=right]:slide-in-from-left-2 web:data-[side=top]:slide-in-from-bottom-2',
              open
                ? 'web:animate-in web:fade-in-0 web:zoom-in-95'
                : 'web:animate-out web:fade-out-0 web:zoom-out-95',
              className
            )}
            {...props}
          />
        </DropdownMenuPrimitive.Overlay>
      </DropdownMenuPrimitive.Portal>
    );
  }
);

Content.displayName = DropdownMenuPrimitive.Content.displayName;

const Item = React.forwardRef<
  DropdownMenuPrimitive.ItemRef,
  DropdownMenuPrimitive.ItemProps & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <TextClassContext.Provider value="select-none text-sm native:text-lg text-popover-foreground web:group-focus:text-accent-foreground">
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        'group relative flex flex-row items-center gap-2 rounded-sm px-4 py-3 active:bg-accent web:cursor-default web:outline-none web:hover:bg-accent web:focus:bg-accent',
        inset && 'pl-8',
        props.disabled && 'opacity-50 web:pointer-events-none',
        className
      )}
      {...props}
    />
  </TextClassContext.Provider>
));

Item.displayName = DropdownMenuPrimitive.Item.displayName;

const Separator = React.forwardRef<
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
