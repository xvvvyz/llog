import { Icon } from '@/components/ui/icon';
import { TextClassContext } from '@/components/ui/text';
import { useRippleColor } from '@/hooks/use-ripple-color';
import { animation } from '@/utilities/animation';
import { cn } from '@/utilities/cn';
import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import { Check, SortAsc, SortDesc } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import {
  forwardRef,
  ReactNode,
  startTransition,
  useCallback,
  useEffect,
  useState,
} from 'react';

const Root = DropdownMenuPrimitive.Root;

const Trigger = DropdownMenuPrimitive.Trigger;

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
              'min-w-36 overflow-hidden rounded-2xl bg-popover py-2',
              className
            )}
            entering={animation(FadeInUp)}
            exiting={animation(FadeOutUp)}
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
  DropdownMenuPrimitive.ItemProps
>(({ className, ...props }, ref) => (
  <TextClassContext.Provider value="text-popover-foreground">
    <DropdownMenuPrimitive.Item
      android_ripple={{ color: useRippleColor('inverse') }}
      className={cn(
        'android:active:bg-transparent group relative flex h-10 flex-row items-center gap-4 px-4 active:bg-accent web:cursor-default web:outline-none web:hover:bg-accent web:focus:bg-accent',
        className
      )}
      ref={ref}
      {...props}
    />
  </TextClassContext.Provider>
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
  const [opChecked, setOpChecked] = useState(checked);
  useEffect(() => setOpChecked(checked), [checked]);

  const handleCheckedChange = useCallback(
    (checked: boolean) => {
      setOpChecked(checked);
      startTransition(() => onCheckedChange?.(checked));
    },
    [onCheckedChange]
  );

  return (
    <TextClassContext.Provider value="text-popover-foreground">
      <DropdownMenuPrimitive.CheckboxItem
        android_ripple={{ color: useRippleColor('inverse') }}
        className={cn(
          'android:active:bg-transparent group relative h-10 flex-row items-center justify-between gap-4 px-4 active:bg-accent web:cursor-default web:outline-none web:hover:bg-accent web:focus:bg-accent',
          className
        )}
        checked={opChecked}
        closeOnPress={false}
        onCheckedChange={handleCheckedChange}
        {...props}
      >
        <View className="flex-row items-center gap-4">{children}</View>
        <DropdownMenuPrimitive.ItemIndicator>
          <Icon className="-mr-1.5" icon={Check} size={20} />
        </DropdownMenuPrimitive.ItemIndicator>
      </DropdownMenuPrimitive.CheckboxItem>
    </TextClassContext.Provider>
  );
};

CheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

export type SortDirection = 'asc' | 'desc';

const SortItem = <T extends string>({
  children,
  className,
  sortBy,
  sortDirection,
  onSort,
  value,
  ...props
}: DropdownMenuPrimitive.ItemProps & {
  children: ReactNode;
  sortBy: T;
  sortDirection: SortDirection;
  onSort: (sort: [T, SortDirection]) => void;
  value: T;
}) => {
  const [opSort, setOpSort] = useState([sortBy, sortDirection]);
  useEffect(() => setOpSort([sortBy, sortDirection]), [sortBy, sortDirection]);
  const isActive = opSort[0] === value;

  const handleSort = useCallback(() => {
    const newSort: [T, SortDirection] = [
      value,
      isActive ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc',
    ];

    setOpSort(newSort);
    startTransition(() => onSort(newSort));
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
        <Icon icon={opSort[1] === 'asc' ? SortAsc : SortDesc} size={20} />
      )}
    </Item>
  );
};

SortItem.displayName = 'SortItem';

export {
  CheckboxItem,
  Content,
  Item,
  // RadioItem,
  Root,
  SortItem,
  Trigger,
};
