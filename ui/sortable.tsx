import { cn } from '@/lib/cn';
import { Icon } from '@/ui/icon';
import { DotsSixVertical } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import * as sheetDrag from '@/ui/sheet-drag';

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
  onDragEnd,
  onDragStart,
  sortEnabled = true,
  ...props
}: AppSortableGridProps<T>) {
  const sheetDragLock = sheetDrag.useSheetDragLock();

  const handleDragStart = React.useCallback<
    NonNullable<SortableGridProps<T>['onDragStart']>
  >(
    (params) => {
      sheetDragLock.lock();
      onDragStart?.(params);
    },
    [onDragStart, sheetDragLock]
  );

  const handleDragEnd = React.useCallback<
    NonNullable<SortableGridProps<T>['onDragEnd']>
  >(
    (params) => {
      sheetDragLock.unlock();
      onDragEnd?.(params);
    },
    [onDragEnd, sheetDragLock]
  );

  const gridProps = {
    activeItemShadowOpacity: 0,
    autoScrollActivationOffset: 50,
    customHandle: true,
    dragActivationDelay: 0,
    itemEntering: null,
    itemExiting: null,
    itemsLayoutTransitionMode: 'reorder',
    onDragEnd: handleDragEnd,
    onDragStart: handleDragStart,
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
}: SortableDragHandleProps) => {
  const sheetDragLock = sheetDrag.useSheetDragLock();

  return (
    <View
      {...sheetDrag.SHEET_SORTABLE_DRAG_HANDLE_PROPS}
      className={cn('cursor-grab items-center justify-center', className)}
      onTouchCancel={sheetDragLock.unlock}
      onTouchEnd={sheetDragLock.unlock}
      onTouchStart={sheetDragLock.lock}
    >
      <Sortable.Handle>
        <Sortable.Touchable
          failDistance={9999}
          gestureMode="simultaneous"
          onTouchesDown={sheetDragLock.lock}
          onTouchesUp={sheetDragLock.unlock}
        >
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
        </Sortable.Touchable>
      </Sortable.Handle>
    </View>
  );
};

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
