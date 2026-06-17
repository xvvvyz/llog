import * as React from 'react';
import type { SharedValue } from 'react-native-reanimated';

type SheetStackOptions = {
  backdropFadeDistance?: number;
  backdropTranslateY?: SharedValue<number>;
  layer: number;
  onDismiss: () => void;
  open: boolean;
  usesGlobalBackdrop?: boolean;
};

type SheetStackState = {
  isLastSheet: boolean;
  isTopSheet: boolean;
  zIndex: number;
};

type SheetStackBackdropState = {
  fadeDistance?: number;
  isLastSheet: boolean;
  layer: number;
  onDismiss: () => void;
  open: boolean;
  translateY?: SharedValue<number>;
};

type NativeSheetStackItem = { id: string; layer: number; order: number };
let nextNativeSheetOrder = 0;
let nativeSheetStack: NativeSheetStackItem[] = [];
const nativeSheetStackListeners = new Set<() => void>();

const emitNativeSheetStackChange = () => {
  for (const listener of nativeSheetStackListeners) listener();
};

const registerNativeSheet = (id: string, layer: number) => {
  const order = ++nextNativeSheetOrder;

  nativeSheetStack = [
    ...nativeSheetStack.filter((item) => item.id !== id),
    { id, layer, order },
  ];

  emitNativeSheetStackChange();

  return () => {
    nativeSheetStack = nativeSheetStack.filter((item) => item.id !== id);
    emitNativeSheetStackChange();
  };
};

const getTopNativeSheet = () =>
  nativeSheetStack.reduce<NativeSheetStackItem | null>((topSheet, item) => {
    if (!topSheet) return item;
    if (item.layer > topSheet.layer) return item;

    if (item.layer === topSheet.layer && item.order > topSheet.order) {
      return item;
    }

    return topSheet;
  }, null);

const getNativeSheetLayerRank = (item: NativeSheetStackItem) =>
  nativeSheetStack.filter(
    (stackItem) =>
      stackItem.layer === item.layer && stackItem.order <= item.order
  ).length;

// Sheets sharing a layer (e.g. an action sheet opened from another action
// sheet) must stack by open order; with a flat per-layer zIndex the paint
// order falls back to portal mount order, which is the static order sheets
// are declared in the layout.
const getNativeSheetZIndex = (item: NativeSheetStackItem) =>
  item.layer + getNativeSheetLayerRank(item);

const subscribeToNativeSheetStack = (listener: () => void) => {
  nativeSheetStackListeners.add(listener);
  return () => nativeSheetStackListeners.delete(listener);
};

export const useSheetStack = ({
  layer,
  open,
}: SheetStackOptions): SheetStackState => {
  const sheetId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    return registerNativeSheet(sheetId, layer);
  }, [layer, open, sheetId]);

  // Encode only this sheet's view of the stack so other sheets opening and
  // closing re-render just the sheets whose state actually changed.
  const getSnapshot = React.useCallback(() => {
    const item = open
      ? nativeSheetStack.find((stackItem) => stackItem.id === sheetId)
      : undefined;

    if (!item) return `0|0|${layer}`;
    const isTopSheet = getTopNativeSheet()?.id === sheetId;
    const isLastSheet = nativeSheetStack.length === 1;
    return `${isTopSheet ? '1' : '0'}|${isLastSheet ? '1' : '0'}|${getNativeSheetZIndex(item)}`;
  }, [layer, open, sheetId]);

  const snapshot = React.useSyncExternalStore(
    subscribeToNativeSheetStack,
    getSnapshot,
    getSnapshot
  );

  const [isTopSheet, isLastSheet, zIndex] = snapshot.split('|');

  return {
    isLastSheet: isLastSheet === '1',
    isTopSheet: isTopSheet === '1',
    zIndex: Number(zIndex),
  };
};

export const useSheetStackBackdrop = (): SheetStackBackdropState => ({
  isLastSheet: false,
  layer: 0,
  onDismiss: () => {},
  open: false,
});
