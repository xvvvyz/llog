import * as React from 'react';
import type { SharedValue } from 'react-native-reanimated';

type SheetStackOptions = {
  backdropFadeDistance?: number;
  backdropTranslateY?: SharedValue<number>;
  layer: number;
  onDismiss: () => void;
  open: boolean;
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
let nativeSheetStackVersion = 0;
let nativeSheetStack: NativeSheetStackItem[] = [];
const nativeSheetStackListeners = new Set<() => void>();

const emitNativeSheetStackChange = () => {
  nativeSheetStackVersion += 1;
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

const subscribeToNativeSheetStack = (listener: () => void) => {
  nativeSheetStackListeners.add(listener);
  return () => nativeSheetStackListeners.delete(listener);
};

const getTopNativeSheetId = () => getTopNativeSheet()?.id ?? null;
const getNativeSheetStackVersion = () => nativeSheetStackVersion;

export const useSheetStack = ({
  layer,
  open,
}: SheetStackOptions): SheetStackState => {
  const sheetId = React.useId();

  const topSheetId = React.useSyncExternalStore(
    subscribeToNativeSheetStack,
    getTopNativeSheetId,
    () => null
  );

  React.useEffect(() => {
    if (!open) return;
    return registerNativeSheet(sheetId, layer);
  }, [layer, open, sheetId]);

  React.useSyncExternalStore(
    subscribeToNativeSheetStack,
    getNativeSheetStackVersion,
    () => 0
  );

  return {
    isLastSheet: open && nativeSheetStack.length === 1,
    isTopSheet: open && topSheetId === sheetId,
    zIndex: layer,
  };
};

export const useSheetStackBackdrop = (): SheetStackBackdropState => ({
  isLastSheet: false,
  layer: 0,
  onDismiss: () => {},
  open: false,
});
