import { useRippleColor } from '@/hooks/use-ripple-color';
import { animation } from '@/lib/animation';
import { cn } from '@/lib/cn';
import { Icon } from '@/ui/icon';
import { TextContext } from '@/ui/text';
import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import { SortAscending, SortDescending } from 'phosphor-react-native';
import * as React from 'react';
import { Pressable, View, type GestureResponderEvent } from 'react-native';

import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutUp,
} from 'react-native-reanimated';

const Root = DropdownMenuPrimitive.Root;
const Trigger = DropdownMenuPrimitive.Trigger;
const OUTSIDE_DISMISS_FOLLOW_UP_SUPPRESSION_MS = 500;
const OUTSIDE_DISMISS_FOLLOW_UP_EVENTS = ['click'] as const;
let outsideDismissFollowUpTimeout: ReturnType<typeof setTimeout> | null = null;

const clearOutsideDismissFollowUpSuppression = () => {
  if (outsideDismissFollowUpTimeout) {
    clearTimeout(outsideDismissFollowUpTimeout);
    outsideDismissFollowUpTimeout = null;
  }

  if (typeof document === 'undefined') return;

  for (const eventName of OUTSIDE_DISMISS_FOLLOW_UP_EVENTS) {
    document.removeEventListener(
      eventName,
      preventOutsideDismissFollowUp,
      true
    );
  }
};

const preventOutsideDismissFollowUp = (event: Event) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  if (event.type === 'click') clearOutsideDismissFollowUpSuppression();
};

const suppressOutsideDismissFollowUpClick = () => {
  if (typeof document === 'undefined') return;

  for (const eventName of OUTSIDE_DISMISS_FOLLOW_UP_EVENTS) {
    document.addEventListener(eventName, preventOutsideDismissFollowUp, true);
  }

  if (outsideDismissFollowUpTimeout) {
    clearTimeout(outsideDismissFollowUpTimeout);
  }

  outsideDismissFollowUpTimeout = setTimeout(
    clearOutsideDismissFollowUpSuppression,
    OUTSIDE_DISMISS_FOLLOW_UP_SUPPRESSION_MS
  );
};

type ResettableDropdownRootContext = ReturnType<
  typeof DropdownMenuPrimitive.useRootContext
> & {
  setContentLayout?: (layout: null) => void;
  setTriggerPosition?: (position: null) => void;
};

const dismissDropdownMenu = (context: ResettableDropdownRootContext) => {
  // This overlay bypasses the primitive overlay, so clear cached placement
  // state when these optional internals are present.
  context.setTriggerPosition?.(null);
  context.setContentLayout?.(null);
  context.onOpenChange(false);
};

const stopOverlayEvent = (event: GestureResponderEvent) => {
  event.stopPropagation();
  (event.nativeEvent as { stopPropagation?: () => void }).stopPropagation?.();
};

const Content = React.forwardRef<
  DropdownMenuPrimitive.ContentRef,
  DropdownMenuPrimitive.ContentProps
>(({ children, className, ...props }, ref) => {
  const context =
    DropdownMenuPrimitive.useRootContext() as ResettableDropdownRootContext;

  const handleOverlayPress = React.useCallback(
    (event: GestureResponderEvent) => {
      stopOverlayEvent(event);
      dismissDropdownMenu(context);
    },
    [context]
  );

  const handleOverlayTouchStart = React.useCallback(
    (event: GestureResponderEvent) => {
      stopOverlayEvent(event);
      suppressOutsideDismissFollowUpClick();
      dismissDropdownMenu(context);
    },
    [context]
  );

  return (
    <DropdownMenuPrimitive.Portal>
      <View className="absolute inset-0" pointerEvents="box-none">
        <Pressable
          className="absolute inset-0"
          onPress={handleOverlayPress}
          onStartShouldSetResponder={() => true}
          onTouchEnd={stopOverlayEvent}
          onTouchStart={handleOverlayTouchStart}
        >
          <Animated.View
            className="absolute inset-0 bg-background/90"
            entering={animation(FadeIn)}
            exiting={animation(FadeOut)}
          />
        </Pressable>
        <DropdownMenuPrimitive.Content ref={ref} {...props}>
          <Animated.View
            entering={animation(FadeInUp)}
            exiting={animation(FadeOutUp)}
            className={cn(
              'border-border-secondary bg-popover my-2 min-w-36 overflow-hidden rounded-2xl border py-2 border-continuous',
              className
            )}
          >
            {children as React.ReactNode}
          </Animated.View>
        </DropdownMenuPrimitive.Content>
      </View>
    </DropdownMenuPrimitive.Portal>
  );
});

Content.displayName = DropdownMenuPrimitive.Content.displayName;

const Item = React.forwardRef<
  DropdownMenuPrimitive.ItemRef,
  DropdownMenuPrimitive.ItemProps
>(({ className, ...props }, ref) => (
  <TextContext.Provider value="text-popover-foreground">
    <DropdownMenuPrimitive.Item
      ref={ref}
      android_ripple={{ color: useRippleColor('inverse') }}
      className={cn(
        'android:active:bg-transparent group active:bg-accent web:cursor-default web:outline-hidden web:hover:bg-accent web:focus:bg-accent relative flex h-10 flex-row items-center gap-4 pr-6 pl-4',
        className
      )}
      {...props}
    />
  </TextContext.Provider>
));

Item.displayName = DropdownMenuPrimitive.Item.displayName;
const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export const isSortDirection = (value: unknown): value is SortDirection =>
  typeof value === 'string' &&
  SORT_DIRECTIONS.some((direction) => direction === value);

const SortItem = <T extends string>({
  children,
  className,
  sortBy,
  sortDirection,
  onSort,
  value,
  ...props
}: DropdownMenuPrimitive.ItemProps & {
  children: React.ReactNode;
  sortBy: T;
  sortDirection: SortDirection;
  onSort: (sort: [T, SortDirection]) => void;
  value: T;
}) => {
  const [opSort, setOpSort] = React.useState([sortBy, sortDirection]);

  React.useEffect(
    () => setOpSort([sortBy, sortDirection]),
    [sortBy, sortDirection]
  );

  const isActive = opSort[0] === value;

  const handleSort = React.useCallback(() => {
    const newSort: [T, SortDirection] = [
      value,
      isActive ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc',
    ];

    setOpSort(newSort);
    React.startTransition(() => onSort(newSort));
  }, [isActive, onSort, sortDirection, value]);

  return (
    <Item
      className={cn('justify-between', className)}
      closeOnPress={false}
      onPress={handleSort}
      {...props}
    >
      <View className="flex-row gap-4 items-center">{children}</View>
      {isActive && (
        <Icon icon={opSort[1] === 'asc' ? SortAscending : SortDescending} />
      )}
    </Item>
  );
};

SortItem.displayName = 'SortItem';
const Separator = () => <View className="my-2 border-border border-t" />;
const useContext = DropdownMenuPrimitive.useRootContext;

export { Content, Item, Root, Separator, SortItem, Trigger, useContext };
