import * as React from 'react';

type SheetStackOptions = {
  layer: number;
  onDismiss: () => void;
  open: boolean;
};

type WebSheetStackItem = { id: string; layer: number; order: number };
let nextWebSheetOrder = 0;
let webSheetStack: WebSheetStackItem[] = [];

const registerWebSheet = (id: string, layer: number) => {
  const order = ++nextWebSheetOrder;

  webSheetStack = [
    ...webSheetStack.filter((item) => item.id !== id),
    { id, layer, order },
  ];

  return () => {
    webSheetStack = webSheetStack.filter((item) => item.id !== id);
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

export const useSheetStack = ({
  layer,
  onDismiss,
  open,
}: SheetStackOptions) => {
  const sheetId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    return registerWebSheet(sheetId, layer);
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
};
