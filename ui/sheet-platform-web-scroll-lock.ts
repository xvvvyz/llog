import * as React from 'react';
import { isTextEntryElement } from '@/ui/sheet-platform-web-text-entry';

type WebScrollLockSnapshot = {
  bodyLeft: string;
  bodyOverflow: string;
  bodyOverscrollBehavior: string;
  bodyPosition: string;
  bodyRight: string;
  bodyTop: string;
  bodyWidth: string;
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
  scrollX: number;
  scrollY: number;
};

let webScrollLockCount = 0;
let webScrollLockSnapshot: WebScrollLockSnapshot | null = null;
const SCROLL_LOCK_ALLOW_SELECTOR = '[data-testid="scroll-lock-allow"]';

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return isTextEntryElement(target);
};

const hasActiveTextSelection = () => {
  const activeElement = document.activeElement;

  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  ) {
    return activeElement.selectionStart !== activeElement.selectionEnd;
  }

  const selection = window.getSelection();
  return !!selection && !selection.isCollapsed;
};

const canScrollElement = (
  element: HTMLElement,
  deltaX: number,
  deltaY: number
) => {
  const style = window.getComputedStyle(element);
  const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

  if (isHorizontal && /(auto|scroll)/.test(style.overflowX)) {
    const maxScrollLeft = element.scrollWidth - element.clientWidth;

    return (
      maxScrollLeft > 0 &&
      ((deltaX < 0 && element.scrollLeft > 0) ||
        (deltaX > 0 && element.scrollLeft < maxScrollLeft))
    );
  }

  if (/(auto|scroll)/.test(style.overflowY)) {
    const maxScrollTop = element.scrollHeight - element.clientHeight;

    return (
      maxScrollTop > 0 &&
      ((deltaY < 0 && element.scrollTop > 0) ||
        (deltaY > 0 && element.scrollTop < maxScrollTop))
    );
  }

  return false;
};

const canScrollWithinTarget = (
  target: EventTarget | null,
  deltaX: number,
  deltaY: number
) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest(SCROLL_LOCK_ALLOW_SELECTOR)) return true;
  let element: HTMLElement | null = target;

  while (element && element !== document.body) {
    if (canScrollElement(element, deltaX, deltaY)) return true;
    element = element.parentElement;
  }

  return false;
};

export const useWebSheetScrollLock = (open: boolean) => {
  React.useEffect(() => {
    if (typeof window === 'undefined' || !open) return;
    const body = document.body;
    const html = document.documentElement;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    let restoreFrame: number | undefined;
    let touchStartX = 0;
    let touchStartY = 0;

    if (webScrollLockCount === 0) {
      webScrollLockSnapshot = {
        bodyLeft: body.style.left,
        bodyOverflow: body.style.overflow,
        bodyOverscrollBehavior: body.style.overscrollBehavior,
        bodyPosition: body.style.position,
        bodyRight: body.style.right,
        bodyTop: body.style.top,
        bodyWidth: body.style.width,
        htmlOverflow: html.style.overflow,
        htmlOverscrollBehavior: html.style.overscrollBehavior,
        scrollX,
        scrollY,
      };

      html.style.overflow = 'hidden';
      html.style.overscrollBehavior = 'none';
      body.style.left = `-${scrollX}px`;
      body.style.overflow = 'hidden';
      body.style.overscrollBehavior = 'none';
      body.style.position = 'fixed';
      body.style.right = '0';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
    }

    webScrollLockCount += 1;

    const restoreScrollPosition = () => {
      const snapshot = webScrollLockSnapshot;
      if (!snapshot) return;
      if (restoreFrame !== undefined) window.cancelAnimationFrame(restoreFrame);

      restoreFrame = window.requestAnimationFrame(() => {
        window.scrollTo(snapshot.scrollX, snapshot.scrollY);
      });
    };

    window.addEventListener('scroll', restoreScrollPosition, { passive: true });

    const preventPageWheel = (event: WheelEvent) => {
      if (canScrollWithinTarget(event.target, event.deltaX, event.deltaY)) {
        return;
      }

      event.preventDefault();
    };

    const captureTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    };

    const preventPageTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      if (hasActiveTextSelection()) return;
      const deltaX = touchStartX - touch.clientX;
      const deltaY = touchStartY - touch.clientY;
      if (canScrollWithinTarget(event.target, deltaX, deltaY)) return;
      event.preventDefault();
    };

    const preventPageKeyboardScroll = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) return;

      if (
        [
          ' ',
          'ArrowDown',
          'ArrowUp',
          'End',
          'Home',
          'PageDown',
          'PageUp',
        ].includes(event.key)
      ) {
        event.preventDefault();
      }
    };

    const activeOptions = { capture: true, passive: false };
    const passiveOptions = { capture: true, passive: true };
    const captureOptions = { capture: true };
    document.addEventListener('wheel', preventPageWheel, activeOptions);
    document.addEventListener('touchstart', captureTouchStart, passiveOptions);
    document.addEventListener('touchmove', preventPageTouchMove, activeOptions);

    document.addEventListener(
      'keydown',
      preventPageKeyboardScroll,
      captureOptions
    );

    return () => {
      window.removeEventListener('scroll', restoreScrollPosition);
      document.removeEventListener('wheel', preventPageWheel, captureOptions);

      document.removeEventListener(
        'touchstart',
        captureTouchStart,
        captureOptions
      );

      document.removeEventListener(
        'touchmove',
        preventPageTouchMove,
        captureOptions
      );

      document.removeEventListener(
        'keydown',
        preventPageKeyboardScroll,
        captureOptions
      );

      if (restoreFrame !== undefined) window.cancelAnimationFrame(restoreFrame);
      webScrollLockCount = Math.max(0, webScrollLockCount - 1);
      if (webScrollLockCount > 0 || !webScrollLockSnapshot) return;
      const snapshot = webScrollLockSnapshot;
      webScrollLockSnapshot = null;
      html.style.overflow = snapshot.htmlOverflow;
      html.style.overscrollBehavior = snapshot.htmlOverscrollBehavior;
      body.style.left = snapshot.bodyLeft;
      body.style.overflow = snapshot.bodyOverflow;
      body.style.overscrollBehavior = snapshot.bodyOverscrollBehavior;
      body.style.position = snapshot.bodyPosition;
      body.style.right = snapshot.bodyRight;
      body.style.top = snapshot.bodyTop;
      body.style.width = snapshot.bodyWidth;
      window.scrollTo(snapshot.scrollX, snapshot.scrollY);
    };
  }, [open]);
};
