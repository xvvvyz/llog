import { useRippleColor } from '@/hooks/use-ripple-color';
import { animation } from '@/lib/animation';
import { cn } from '@/lib/cn';
import { Icon } from '@/ui/icon';
import { Text, TextContext } from '@/ui/text';
import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import { Check } from 'phosphor-react-native/lib/module/icons/Check';
import { SortAscending } from 'phosphor-react-native/lib/module/icons/SortAscending';
import { SortDescending } from 'phosphor-react-native/lib/module/icons/SortDescending';
import { View } from 'react-native';

import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutUp,
} from 'react-native-reanimated';

import * as React from 'react';

const Root = DropdownMenuPrimitive.Root;

const Trigger = DropdownMenuPrimitive.Trigger;

const Content = React.forwardRef<
  DropdownMenuPrimitive.ContentRef,
  DropdownMenuPrimitive.ContentProps
>(({ children, className, ...props }, ref) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Overlay className="absolute inset-0">
        <Animated.View
          className="bg-background/90 absolute inset-0"
          entering={animation(FadeIn)}
          exiting={animation(FadeOut)}
        />
        <DropdownMenuPrimitive.Content ref={ref} {...props}>
          <Animated.View
            className={cn(
              'border-border-secondary bg-popover my-2 min-w-36 overflow-hidden rounded-2xl border py-2',
              className
            )}
            entering={animation(FadeInUp)}
            exiting={animation(FadeOutUp)}
            style={{ borderCurve: 'continuous' }}
          >
            {children as React.ReactNode}
          </Animated.View>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Overlay>
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
      android_ripple={{ color: useRippleColor('inverse') }}
      className={cn(
        'android:active:bg-transparent group active:bg-accent web:cursor-default web:outline-hidden web:hover:bg-accent web:focus:bg-accent relative flex h-10 flex-row items-center gap-4 pr-6 pl-4',
        className
      )}
      ref={ref}
      {...props}
    />
  </TextContext.Provider>
));

Item.displayName = DropdownMenuPrimitive.Item.displayName;

const CheckboxItem = ({
  checked,
  children,
  className,
  onCheckedChange,
  ...props
}: DropdownMenuPrimitive.CheckboxItemProps & {
  children?: React.ReactNode;
  ref?: React.RefObject<DropdownMenuPrimitive.CheckboxItemRef>;
}) => {
  const [opChecked, setOpChecked] = React.useState(checked);
  React.useEffect(() => setOpChecked(checked), [checked]);

  const handleCheckedChange = React.useCallback(
    (checked: boolean) => {
      setOpChecked(checked);
      React.startTransition(() => onCheckedChange?.(checked));
    },
    [onCheckedChange]
  );

  return (
    <TextContext.Provider value="text-popover-foreground">
      <DropdownMenuPrimitive.CheckboxItem
        android_ripple={{ color: useRippleColor('inverse') }}
        className={cn(
          'android:active:bg-transparent group active:bg-accent web:cursor-default web:outline-hidden web:hover:bg-accent web:focus:bg-accent relative h-10 flex-row items-center justify-between gap-4 px-4',
          className
        )}
        checked={opChecked}
        closeOnPress={false}
        onCheckedChange={handleCheckedChange}
        {...props}
      >
        <View className="flex-row items-center gap-4">{children}</View>
        <DropdownMenuPrimitive.ItemIndicator>
          <Icon className="-mr-1.5" icon={Check} />
        </DropdownMenuPrimitive.ItemIndicator>
      </DropdownMenuPrimitive.CheckboxItem>
    </TextContext.Provider>
  );
};

CheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

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
      <View className="flex-row items-center gap-4">{children}</View>
      {isActive && (
        <Icon icon={opSort[1] === 'asc' ? SortAscending : SortDescending} />
      )}
    </Item>
  );
};

SortItem.displayName = 'SortItem';

const Label = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <TextContext.Provider value="text-popover-foreground">
    <View className={cn('px-4 pt-2 pb-1', className)}>
      <Text className="text-muted-foreground text-xs">{children}</Text>
    </View>
  </TextContext.Provider>
);

Label.displayName = 'Label';

const Separator = () => <View className="border-border my-2 border-t" />;

const useContext = DropdownMenuPrimitive.useRootContext;

export {
  CheckboxItem,
  Content,
  Item,
  Label,
  Root,
  Separator,
  SortItem,
  Trigger,
  useContext,
};
