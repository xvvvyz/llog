import * as React from 'react';

type SheetStackOptions = {
  layer: number;
  onDismiss: () => void;
  open: boolean;
};

type SheetStackState = { isTopSheet: boolean; zIndex: number };

type SheetStackBackdropState = {
  layer: number;
  onDismiss: () => void;
  open: boolean;
};

type WebSheetStackItem = {
  id: string;
  layer: number;
  onDismissRef: React.RefObject<() => void>;
  order: number;
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
  onDismissRef: React.RefObject<() => void>
) => {
  const order = ++nextWebSheetOrder;

  webSheetStack = [
    ...webSheetStack.filter((item) => item.id !== id),
    { id, layer, onDismissRef, order },
  ];

  emitWebSheetStackChange();

  return () => {
    webSheetStack = webSheetStack.filter((item) => item.id !== id);
    emitWebSheetStackChange();
  };
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
  layer,
  onDismiss,
  open,
}: SheetStackOptions): SheetStackState => {
  const sheetId = React.useId();
  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const [sheetOrder, setSheetOrder] = React.useState(0);

  const topSheetId = React.useSyncExternalStore(
    subscribeToWebSheetStack,
    getTopWebSheetId,
    () => null
  );

  React.useEffect(() => {
    if (!open) return;
    const order = nextWebSheetOrder + 1;
    setSheetOrder(order);
    return registerWebSheet(sheetId, layer, onDismissRef);
  }, [layer, open, sheetId]);

  React.useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (getTopWebSheet()?.id !== sheetId) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      onDismiss();
    };

    document.addEventListener('keyup', handleKeyUp, false);
    return () => document.removeEventListener('keyup', handleKeyUp, false);
  }, [onDismiss, open, sheetId]);

  return {
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

  return {
    layer: topSheet ? Math.max(0, getWebSheetZIndex(topSheet) - 1) : 0,
    onDismiss: () => topSheet?.onDismissRef.current(),
    open: !!topSheet,
  };
};
