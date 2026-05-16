import * as React from 'react';
import { SHEET_SCROLL_TOP_TOLERANCE } from '@/ui/sheet-drag-constants';

export type SheetScrollContextValue = {
  setScrollableAtTop: (id: string, atTop: boolean) => void;
  unregisterScrollable: (id: string) => void;
};

export type SheetDragLockContextValue = {
  lockSheetDrag: (id: string) => void;
  unlockSheetDrag: (id: string) => void;
};

type SheetScrollableEvent = { nativeEvent: { contentOffset?: { y?: number } } };

const SheetScrollContext = React.createContext<SheetScrollContextValue | null>(
  null
);

const SheetDragLockContext =
  React.createContext<SheetDragLockContextValue | null>(null);

export const useSheetScrollHandler = <Event extends SheetScrollableEvent>(
  onScroll?: (event: Event) => void
) => {
  const context = React.useContext(SheetScrollContext);
  const scrollableId = React.useId();
  const isAtTopRef = React.useRef(true);

  React.useEffect(
    () => () => context?.unregisterScrollable(scrollableId),
    [context, scrollableId]
  );

  return React.useCallback(
    (event: Event) => {
      const offsetY = event.nativeEvent.contentOffset?.y ?? 0;
      const isAtTop = offsetY <= SHEET_SCROLL_TOP_TOLERANCE;

      if (isAtTopRef.current !== isAtTop) {
        isAtTopRef.current = isAtTop;
        context?.setScrollableAtTop(scrollableId, isAtTop);
      }

      onScroll?.(event);
    },
    [context, onScroll, scrollableId]
  );
};

export const useSheetDragLock = () => {
  const context = React.useContext(SheetDragLockContext);
  const lockId = React.useId();
  const isLockedRef = React.useRef(false);

  const unlock = React.useCallback(() => {
    if (!isLockedRef.current) return;
    isLockedRef.current = false;
    context?.unlockSheetDrag(lockId);
  }, [context, lockId]);

  const lock = React.useCallback(() => {
    if (isLockedRef.current) return;
    isLockedRef.current = true;
    context?.lockSheetDrag(lockId);
  }, [context, lockId]);

  React.useEffect(() => unlock, [unlock]);
  return React.useMemo(() => ({ lock, unlock }), [lock, unlock]);
};

export const SheetDragProviders = ({
  children,
  dragLock,
  scroll,
}: {
  children: React.ReactNode;
  dragLock: SheetDragLockContextValue;
  scroll: SheetScrollContextValue;
}) => (
  <SheetDragLockContext.Provider value={dragLock}>
    <SheetScrollContext.Provider value={scroll}>
      {children}
    </SheetScrollContext.Provider>
  </SheetDragLockContext.Provider>
);
