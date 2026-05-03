import * as React from 'react';

type DismissStackOptions = {
  id?: string;
  layer: number;
  onDismiss: () => void;
  open: boolean;
};

type WebDismissStackItem = {
  id: string;
  layer: number;
  onDismissRef: React.MutableRefObject<() => void>;
  order: number;
};

let nextWebDismissOrder = 0;
let webDismissStack: WebDismissStackItem[] = [];
let isEscapeKeyListenerAttached = false;

const getTopWebDismissItem = () =>
  webDismissStack.reduce<WebDismissStackItem | null>((topItem, item) => {
    if (!topItem) return item;
    if (item.layer > topItem.layer) return item;
    if (item.layer === topItem.layer && item.order > topItem.order) return item;
    return topItem;
  }, null);

const handleEscapeKeyUp = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const topItem = getTopWebDismissItem();
  if (!topItem) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  topItem.onDismissRef.current();
};

const updateEscapeKeyListener = () => {
  if (typeof document === 'undefined') return;

  if (webDismissStack.length > 0 && !isEscapeKeyListenerAttached) {
    document.addEventListener('keyup', handleEscapeKeyUp, true);
    isEscapeKeyListenerAttached = true;
    return;
  }

  if (webDismissStack.length === 0 && isEscapeKeyListenerAttached) {
    document.removeEventListener('keyup', handleEscapeKeyUp, true);
    isEscapeKeyListenerAttached = false;
  }
};

const registerWebDismissItem = (
  id: string,
  layer: number,
  onDismissRef: React.MutableRefObject<() => void>
) => {
  const order = ++nextWebDismissOrder;

  webDismissStack = [
    ...webDismissStack.filter((item) => item.id !== id),
    { id, layer, onDismissRef, order },
  ];

  updateEscapeKeyListener();

  return () => {
    webDismissStack = webDismissStack.filter((item) => item.id !== id);
    updateEscapeKeyListener();
  };
};

export const useDismissStack = ({
  id,
  layer,
  onDismiss,
  open,
}: DismissStackOptions) => {
  const generatedId = React.useId();
  const dismissId = id ?? generatedId;
  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;

  React.useEffect(() => {
    if (!open) return;
    return registerWebDismissItem(dismissId, layer, onDismissRef);
  }, [dismissId, layer, open]);
};
