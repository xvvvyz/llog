import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

type SheetPlatformLayoutOptions = {
  bottomInset: number;
  open: boolean;
  windowHeight: number;
};

type SheetPlatformLayout = {
  bottomSpacerStyle: StyleProp<ViewStyle>;
  keyboardAvoidingStyle?: StyleProp<ViewStyle>;
  viewportHeight: number;
};

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

type WebVisualViewport = { bottomInset: number; height?: number };
let webScrollLockCount = 0;
let webScrollLockSnapshot: WebScrollLockSnapshot | null = null;
const SCROLL_LOCK_ALLOW_SELECTOR = '[data-testid="scroll-lock-allow"]';
const WEB_SHEET_BOTTOM_OVERSCAN = 128;

const getWebVisualViewport = (baselineHeight?: number): WebVisualViewport => {
  if (typeof window === 'undefined') {
    return { bottomInset: 0, height: undefined };
  }

  const activeElement = document.activeElement as HTMLElement | null;
  const tagName = activeElement?.tagName;

  const textEntryFocused =
    tagName === 'TEXTAREA' ||
    tagName === 'INPUT' ||
    !!activeElement?.isContentEditable;

  if (!textEntryFocused) return { bottomInset: 0, height: undefined };
  const viewport = window.visualViewport;
  const documentHeight = document.documentElement?.clientHeight ?? 0;

  const layoutHeight = Math.max(
    baselineHeight ?? 0,
    window.innerHeight,
    documentHeight
  );

  if (!viewport) return { bottomInset: 0, height: window.innerHeight };
  const viewportBottom = viewport.offsetTop + viewport.height;

  return {
    bottomInset: Math.max(0, Math.round(layoutHeight - viewportBottom)),
    height: Math.round(viewport.height),
  };
};

const useWebSheetVisualViewport = (open: boolean): WebVisualViewport => {
  const baselineHeightRef = React.useRef(0);
  const baselineWidthRef = React.useRef(0);
  const [viewport, setViewport] = React.useState(getWebVisualViewport);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const documentHeight = document.documentElement?.clientHeight ?? 0;
      const layoutWidth = window.innerWidth;

      if (
        baselineWidthRef.current &&
        baselineWidthRef.current !== layoutWidth
      ) {
        baselineHeightRef.current = 0;
      }

      baselineWidthRef.current = layoutWidth;

      baselineHeightRef.current = Math.max(
        baselineHeightRef.current,
        window.innerHeight,
        documentHeight
      );

      setViewport(getWebVisualViewport(baselineHeightRef.current));
    };

    update();
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', update);
    visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('focusin', update);
    window.addEventListener('focusout', update);

    return () => {
      visualViewport?.removeEventListener('resize', update);
      visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('focusin', update);
      window.removeEventListener('focusout', update);
    };
  }, [open]);

  if (!open) return { bottomInset: 0, height: undefined };
  return viewport;
};

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;

  return (
    tagName === 'TEXTAREA' || tagName === 'INPUT' || target.isContentEditable
  );
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

const useWebSheetScrollLock = (open: boolean) => {
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

export const useSheetPlatformLayout = ({
  bottomInset,
  open,
  windowHeight,
}: SheetPlatformLayoutOptions): SheetPlatformLayout => {
  const webViewport = useWebSheetVisualViewport(open);
  useWebSheetScrollLock(open);

  return {
    bottomSpacerStyle: {
      marginBottom: -WEB_SHEET_BOTTOM_OVERSCAN,
      paddingBottom: bottomInset + WEB_SHEET_BOTTOM_OVERSCAN,
    },
    keyboardAvoidingStyle: webViewport.bottomInset
      ? { bottom: webViewport.bottomInset }
      : undefined,
    viewportHeight: webViewport.height ?? windowHeight,
  };
};
