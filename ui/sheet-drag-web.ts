export type WebTouchState = {
  isDragging: boolean;
  lastTime: number;
  lastY: number;
  startedInHandle: boolean;
  startTarget: unknown;
  startX: number;
  startY: number;
  velocityY: number;
};

const getWebTargetElement = (target: unknown) => {
  if (typeof HTMLElement === 'undefined') return null;
  return target instanceof HTMLElement ? target : null;
};

const canWebScrollElement = (element: HTMLElement, deltaY: number) => {
  const style = window.getComputedStyle(element);
  if (!/(auto|scroll)/.test(style.overflowY)) return false;
  const maxScrollTop = element.scrollHeight - element.clientHeight;

  return (
    maxScrollTop > 0 &&
    ((deltaY < 0 && element.scrollTop > 0) ||
      (deltaY > 0 && element.scrollTop < maxScrollTop))
  );
};

export const canWebScrollWithinTarget = (target: unknown, deltaY: number) => {
  let element = getWebTargetElement(target);

  while (element && element !== document.body) {
    if (canWebScrollElement(element, deltaY)) return true;
    element = element.parentElement;
  }

  return false;
};

export const isWebTextEntryTarget = (target: unknown) => {
  const element = getWebTargetElement(target);
  const tagName = element?.tagName;

  return (
    tagName === 'TEXTAREA' ||
    tagName === 'INPUT' ||
    !!element?.isContentEditable
  );
};

export const isWebSheetDragLockedTarget = (
  target: unknown,
  dragHandleTestId: string
) =>
  !!getWebTargetElement(target)?.closest(`[data-testid="${dragHandleTestId}"]`);

export const isWebSheetDragHandleTarget = ({
  handleHeight,
  pageY,
  surfaceTestId,
  target,
}: {
  handleHeight: number;
  pageY: number;
  surfaceTestId: string;
  target: unknown;
}) => {
  const sheetElement = getWebTargetElement(target)?.closest(
    `[data-testid="${surfaceTestId}"]`
  );

  if (!(sheetElement instanceof HTMLElement)) return false;
  const sheetTop = sheetElement.getBoundingClientRect().top + window.scrollY;
  return pageY >= sheetTop && pageY <= sheetTop + handleHeight;
};
