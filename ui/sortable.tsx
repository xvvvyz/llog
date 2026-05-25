import { cn } from '@/lib/cn';
import { Icon } from '@/ui/icon';
import { SHEET_SORTABLE_DRAG_HANDLE_PROPS } from '@/ui/sheet-drag-constants';
import { useSheetDragLock } from '@/ui/sheet-drag-context';
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
  onDragEnd,
  onDragStart,
  sortEnabled = true,
  ...props
}: AppSortableGridProps<T>) {
  const sheetDragLock = useSheetDragLock();

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
  disabled?: boolean;
  iconClassName?: string;
  iconSize?: number;
};

export const SortableDragHandle = ({
  className,
  contentClassName,
  disabled = false,
  iconClassName,
  iconSize,
}: SortableDragHandleProps) => {
  const sheetDragLock = useSheetDragLock();

  const content = (
    <View
      className={cn(
        'h-full w-full items-center justify-center',
        contentClassName
      )}
    >
      <Icon
        className={cn(iconClassName ?? 'text-placeholder')}
        icon={DotsSixVertical}
        size={iconSize}
      />
    </View>
  );

  return (
    <View
      {...(disabled ? {} : SHEET_SORTABLE_DRAG_HANDLE_PROPS)}
      onTouchCancel={disabled ? undefined : sheetDragLock.unlock}
      onTouchEnd={disabled ? undefined : sheetDragLock.unlock}
      onTouchStart={disabled ? undefined : sheetDragLock.lock}
      className={cn(
        'items-center justify-center',
        disabled ? 'cursor-default opacity-50' : 'cursor-grab',
        className
      )}
    >
      {disabled ? (
        content
      ) : (
        <Sortable.Handle>
          <Sortable.Touchable
            failDistance={9999}
            gestureMode="simultaneous"
            onTouchesDown={sheetDragLock.lock}
            onTouchesUp={sheetDragLock.unlock}
          >
            {content}
          </Sortable.Touchable>
        </Sortable.Handle>
      )}
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
