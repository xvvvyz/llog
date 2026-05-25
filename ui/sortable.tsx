import { cn } from '@/lib/cn';
import { Icon } from '@/ui/icon';
import { SHEET_SORTABLE_DRAG_HANDLE_PROPS } from '@/ui/sheet-drag-constants';
import { useSheetDragLock } from '@/ui/sheet-drag-context';
import { DotsSixVertical } from 'phosphor-react-native';
import * as React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import Sortable, {
  type SortableGridDragEndParams,
  type SortableGridProps,
} from 'react-native-sortables';

export type { SortableGridDragEndParams };

const WEB_SELECTION_LOCK_ATTRIBUTE = 'data-llog-sortable-selection-lock';

const WEB_INTERACTION_RELEASE_EVENTS = [
  'pointerup',
  'pointercancel',
  'mouseup',
  'touchend',
  'touchcancel',
] as const;

let isWebSelectionLocked = false;

const clearWebSelection = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.getSelection()?.removeAllRanges();
};

const addWebInteractionReleaseListeners = (listener: EventListener) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  for (const eventName of WEB_INTERACTION_RELEASE_EVENTS) {
    document.addEventListener(eventName, listener, true);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('blur', listener, true);
  }
};

const removeWebInteractionReleaseListeners = (listener: EventListener) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  for (const eventName of WEB_INTERACTION_RELEASE_EVENTS) {
    document.removeEventListener(eventName, listener, true);
  }

  if (typeof window !== 'undefined') {
    window.removeEventListener('blur', listener, true);
  }
};

const disableWebSelectionLock = () => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  isWebSelectionLocked = false;
  document.documentElement.removeAttribute(WEB_SELECTION_LOCK_ATTRIBUTE);
  removeWebInteractionReleaseListeners(disableWebSelectionLock);
  clearWebSelection();
};

const enableWebSelectionLock = () => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.documentElement.setAttribute(WEB_SELECTION_LOCK_ATTRIBUTE, 'true');
  clearWebSelection();
  if (isWebSelectionLocked) return;
  isWebSelectionLocked = true;
  addWebInteractionReleaseListeners(disableWebSelectionLock);
};

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
  const isDraggingRef = React.useRef(false);

  const handleDragStart = React.useCallback<
    NonNullable<SortableGridProps<T>['onDragStart']>
  >(
    (params) => {
      isDraggingRef.current = true;
      sheetDragLock.lock();
      enableWebSelectionLock();
      onDragStart?.(params);
    },
    [onDragStart, sheetDragLock]
  );

  const handleDragEnd = React.useCallback<
    NonNullable<SortableGridProps<T>['onDragEnd']>
  >(
    (params) => {
      isDraggingRef.current = false;
      sheetDragLock.unlock();
      disableWebSelectionLock();
      onDragEnd?.(params);
    },
    [onDragEnd, sheetDragLock]
  );

  React.useEffect(
    () => () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      sheetDragLock.unlock();
      disableWebSelectionLock();
    },
    [sheetDragLock]
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
  interactive?: boolean;
};

type SortableDragSurfaceProps = React.PropsWithChildren<{
  className?: string;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}>;

const useSortableInteractionLock = () => {
  const sheetDragLock = useSheetDragLock();
  const isInteractionLockedRef = React.useRef(false);

  const unlockSortableInteraction = React.useCallback(() => {
    if (isInteractionLockedRef.current) {
      isInteractionLockedRef.current = false;
      sheetDragLock.unlock();
    }

    removeWebInteractionReleaseListeners(unlockSortableInteraction);
    disableWebSelectionLock();
  }, [sheetDragLock]);

  const lockSortableInteraction = React.useCallback(() => {
    if (!isInteractionLockedRef.current) {
      isInteractionLockedRef.current = true;
      sheetDragLock.lock();
      addWebInteractionReleaseListeners(unlockSortableInteraction);
    }

    enableWebSelectionLock();
  }, [sheetDragLock, unlockSortableInteraction]);

  React.useEffect(() => unlockSortableInteraction, [unlockSortableInteraction]);
  return { lockSortableInteraction, unlockSortableInteraction };
};

export const SortableDragSurface = ({
  children,
  className,
  disabled = false,
  onPress,
  style,
}: SortableDragSurfaceProps) => {
  const { lockSortableInteraction, unlockSortableInteraction } =
    useSortableInteractionLock();

  if (disabled) {
    return (
      <View className={className} style={style}>
        {children}
      </View>
    );
  }

  return (
    <Sortable.Handle style={[{ flex: 1 }, style]}>
      <Sortable.Touchable
        className={className}
        failDistance={10}
        gestureMode="simultaneous"
        onTap={onPress}
        onTouchesDown={lockSortableInteraction}
        onTouchesUp={unlockSortableInteraction}
      >
        {children}
      </Sortable.Touchable>
    </Sortable.Handle>
  );
};

export const SortableDragHandle = ({
  className,
  contentClassName,
  disabled = false,
  iconClassName,
  iconSize,
  interactive = true,
}: SortableDragHandleProps) => {
  const { lockSortableInteraction, unlockSortableInteraction } =
    useSortableInteractionLock();

  const isInteractive = interactive && !disabled;

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
      {...(isInteractive ? SHEET_SORTABLE_DRAG_HANDLE_PROPS : {})}
      onPointerCancel={isInteractive ? unlockSortableInteraction : undefined}
      onPointerDown={isInteractive ? lockSortableInteraction : undefined}
      onPointerUp={isInteractive ? unlockSortableInteraction : undefined}
      onTouchCancel={isInteractive ? unlockSortableInteraction : undefined}
      onTouchEnd={isInteractive ? unlockSortableInteraction : undefined}
      onTouchStart={isInteractive ? lockSortableInteraction : undefined}
      className={cn(
        'items-center justify-center',
        disabled ? 'cursor-default opacity-50' : 'cursor-grab',
        className
      )}
    >
      {!isInteractive ? (
        content
      ) : (
        <Sortable.Handle>
          <Sortable.Touchable
            failDistance={9999}
            gestureMode="simultaneous"
            onTouchesDown={lockSortableInteraction}
            onTouchesUp={unlockSortableInteraction}
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
