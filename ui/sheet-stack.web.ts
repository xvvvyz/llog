import { useDismissStack } from '@/ui/dismiss-stack';
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

type WebSheetStackItem = {
  backdropFadeDistance?: number;
  backdropTranslateY?: SharedValue<number>;
  id: string;
  layer: number;
  onDismissRef: React.RefObject<() => void>;
  order: number;
  usesGlobalBackdrop: boolean;
};

const WEB_SHEET_LAYER_MULTIPLIER = 1_000;
let nextWebSheetOrder = 0;
let webSheetStackVersion = 0;
let webSheetStack: WebSheetStackItem[] = [];
const webSheetStackListeners = new Set<() => void>();

const emitWebSheetStackChange = () => {
  webSheetStackVersion += 1;
  for (const listener of webSheetStackListeners) listener();
};

const registerWebSheet = (
  id: string,
  layer: number,
  onDismissRef: React.RefObject<() => void>,
  order: number,
  usesGlobalBackdrop: boolean
) => {
  webSheetStack = [
    ...webSheetStack.filter((item) => item.id !== id),
    { id, layer, onDismissRef, order, usesGlobalBackdrop },
  ];

  emitWebSheetStackChange();

  return () => {
    webSheetStack = webSheetStack.filter((item) => item.id !== id);
    emitWebSheetStackChange();
  };
};

const updateWebSheet = (
  id: string,
  values: Pick<
    WebSheetStackItem,
    | 'backdropFadeDistance'
    | 'backdropTranslateY'
    | 'layer'
    | 'usesGlobalBackdrop'
  >
) => {
  const currentItem = webSheetStack.find((item) => item.id === id);

  if (
    !currentItem ||
    (currentItem.layer === values.layer &&
      currentItem.backdropTranslateY === values.backdropTranslateY &&
      currentItem.backdropFadeDistance === values.backdropFadeDistance &&
      currentItem.usesGlobalBackdrop === values.usesGlobalBackdrop)
  ) {
    return;
  }

  webSheetStack = webSheetStack.map((item) =>
    item.id === id ? { ...item, ...values } : item
  );

  emitWebSheetStackChange();
};

const getTopWebSheet = () =>
  webSheetStack.reduce<WebSheetStackItem | null>((topSheet, item) => {
    if (!topSheet) return item;
    if (item.layer > topSheet.layer) return item;

    if (item.layer === topSheet.layer && item.order > topSheet.order) {
      return item;
    }

    return topSheet;
  }, null);

const getWebSheetLayerRank = (
  item: Pick<WebSheetStackItem, 'layer' | 'order'>
) =>
  webSheetStack.filter(
    (stackItem) =>
      stackItem.layer === item.layer && stackItem.order <= item.order
  ).length;

const getWebSheetZIndex = (item: Pick<WebSheetStackItem, 'layer' | 'order'>) =>
  item.layer * WEB_SHEET_LAYER_MULTIPLIER + getWebSheetLayerRank(item) * 2;

const subscribeToWebSheetStack = (listener: () => void) => {
  webSheetStackListeners.add(listener);
  return () => webSheetStackListeners.delete(listener);
};

const getTopWebSheetId = () => getTopWebSheet()?.id ?? null;
const getWebSheetStackVersion = () => webSheetStackVersion;

export const useSheetStack = ({
  backdropFadeDistance,
  backdropTranslateY,
  layer,
  onDismiss,
  open,
  usesGlobalBackdrop = true,
}: SheetStackOptions): SheetStackState => {
  const sheetId = React.useId();
  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const layerRef = React.useRef(layer);
  layerRef.current = layer;
  const [sheetOrder, setSheetOrder] = React.useState(0);

  const topSheetId = React.useSyncExternalStore(
    subscribeToWebSheetStack,
    getTopWebSheetId,
    () => null
  );

  React.useSyncExternalStore(
    subscribeToWebSheetStack,
    getWebSheetStackVersion,
    () => 0
  );

  React.useEffect(() => {
    if (!open) return;
    const order = ++nextWebSheetOrder;
    setSheetOrder(order);

    return registerWebSheet(
      sheetId,
      layerRef.current,
      onDismissRef,
      order,
      usesGlobalBackdrop
    );
  }, [open, sheetId, usesGlobalBackdrop]);

  React.useEffect(() => {
    if (!open) return;

    updateWebSheet(sheetId, {
      backdropFadeDistance,
      backdropTranslateY,
      layer,
      usesGlobalBackdrop,
    });
  }, [
    backdropFadeDistance,
    backdropTranslateY,
    layer,
    open,
    sheetId,
    usesGlobalBackdrop,
  ]);

  useDismissStack({ id: sheetId, layer, onDismiss, open });

  return {
    isLastSheet: open && webSheetStack.length === 1,
    isTopSheet: open && topSheetId === sheetId,
    zIndex: getWebSheetZIndex({ layer, order: sheetOrder }),
  };
};

export const useSheetStackBackdrop = (): SheetStackBackdropState => {
  React.useSyncExternalStore(
    subscribeToWebSheetStack,
    getWebSheetStackVersion,
    () => 0
  );

  const topSheet = getTopWebSheet();
  const isLastSheet = webSheetStack.length === 1;
  const usesGlobalBackdrop = topSheet?.usesGlobalBackdrop ?? false;

  return {
    fadeDistance:
      usesGlobalBackdrop && isLastSheet
        ? topSheet?.backdropFadeDistance
        : undefined,
    isLastSheet,
    layer:
      topSheet && usesGlobalBackdrop
        ? Math.max(0, getWebSheetZIndex(topSheet) - 1)
        : 0,
    onDismiss: () => topSheet?.onDismissRef.current(),
    open: !!topSheet && usesGlobalBackdrop,
    translateY:
      usesGlobalBackdrop && isLastSheet
        ? topSheet?.backdropTranslateY
        : undefined,
  };
};
