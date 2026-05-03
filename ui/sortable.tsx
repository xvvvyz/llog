import { cn } from '@/lib/cn';
import { Icon } from '@/ui/icon';
import { DotsSixVertical } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

import Sortable, {
  type SortableGridDragEndParams,
  type SortableGridProps,
} from 'react-native-sortables';

export type { SortableGridDragEndParams };

type AppSortableGridProps<T> = Omit<
  SortableGridProps<T>,
  | 'activeItemShadowOpacity'
  | 'autoScrollActivationOffset'
  | 'customHandle'
  | 'dragActivationDelay'
  | 'itemEntering'
  | 'itemExiting'
  | 'itemsLayoutTransitionMode'
  | 'sortEnabled'
> & { sortEnabled?: SortableGridProps<T>['sortEnabled'] };

export function SortableGrid<T>({
  sortEnabled = true,
  ...props
}: AppSortableGridProps<T>) {
  const gridProps = {
    activeItemShadowOpacity: 0,
    autoScrollActivationOffset: 50,
    customHandle: true,
    dragActivationDelay: 0,
    itemEntering: null,
    itemExiting: null,
    itemsLayoutTransitionMode: 'reorder',
    sortEnabled,
    ...props,
  } as SortableGridProps<T>;

  return <Sortable.Grid {...gridProps} />;
}

type SortableDragHandleProps = {
  className?: string;
  contentClassName?: string;
  iconClassName?: string;
  iconSize?: number;
};

export const SortableDragHandle = ({
  className,
  contentClassName,
  iconClassName,
  iconSize,
}: SortableDragHandleProps) => (
  <View className={cn('cursor-grab items-center justify-center', className)}>
    <Sortable.Handle>
      <View
        className={cn(
          'h-full w-full items-center justify-center',
          contentClassName
        )}
      >
        <Icon
          className={iconClassName ?? 'text-placeholder'}
          icon={DotsSixVertical}
          size={iconSize}
        />
      </View>
    </Sortable.Handle>
  </View>
);

export const SortableSheetDragHandle = ({
  className,
  contentClassName,
  ...props
}: SortableDragHandleProps) => (
  <SortableDragHandle
    className={cn('h-8 w-8 shrink-0 self-center', className)}
    contentClassName={cn('h-8 w-8', contentClassName)}
    {...props}
  />
);
