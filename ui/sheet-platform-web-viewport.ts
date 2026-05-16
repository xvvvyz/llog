import * as React from 'react';
import { isTextEntryElement } from '@/ui/sheet-platform-web-text-entry';

type WebVisualViewport = { bottomInset: number; height?: number };

const EMPTY_WEB_VISUAL_VIEWPORT: WebVisualViewport = {
  bottomInset: 0,
  height: undefined,
};

const isTextEntryInRoot = (root: unknown, target: EventTarget | null) =>
  root instanceof HTMLElement &&
  target instanceof HTMLElement &&
  isTextEntryElement(target) &&
  root.contains(target);

const getWebVisualViewport = (
  baselineHeight?: number,
  activeElementRoot?: unknown
): WebVisualViewport => {
  if (typeof window === 'undefined') return EMPTY_WEB_VISUAL_VIEWPORT;
  const activeElement = document.activeElement as HTMLElement | null;
  if (!isTextEntryElement(activeElement)) return EMPTY_WEB_VISUAL_VIEWPORT;

  if (!isTextEntryInRoot(activeElementRoot, activeElement)) {
    return EMPTY_WEB_VISUAL_VIEWPORT;
  }

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

export const useWebSheetVisualViewport = (
  open: boolean,
  activeElementRootRef?: { current: unknown }
): WebVisualViewport => {
  const baselineHeightRef = React.useRef(0);
  const baselineWidthRef = React.useRef(0);

  const [viewport, setViewport] = React.useState<WebVisualViewport>(
    EMPTY_WEB_VISUAL_VIEWPORT
  );

  React.useEffect(() => {
    if (typeof window === 'undefined' || !open) {
      setViewport(EMPTY_WEB_VISUAL_VIEWPORT);
      return;
    }

    const update = () => {
      const documentHeight = document.documentElement?.clientHeight ?? 0;
      const layoutWidth = window.innerWidth;

      const layoutWidthChanged =
        baselineWidthRef.current && baselineWidthRef.current !== layoutWidth;

      if (layoutWidthChanged) baselineHeightRef.current = 0;
      baselineWidthRef.current = layoutWidth;

      baselineHeightRef.current = Math.max(
        baselineHeightRef.current,
        window.innerHeight,
        documentHeight
      );

      const nextViewport = getWebVisualViewport(
        baselineHeightRef.current,
        activeElementRootRef?.current
      );

      setViewport(nextViewport);
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
  }, [activeElementRootRef, open]);

  if (!open) return EMPTY_WEB_VISUAL_VIEWPORT;
  return viewport;
};
