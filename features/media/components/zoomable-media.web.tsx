import * as zoomableMediaConstants from '@/features/media/constants/zoomable-media';
import { clamp } from '@/lib/clamp';
import * as React from 'react';
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchContentRef,
} from 'react-zoom-pan-pinch';

const DOUBLE_TAP_MAX_DELAY_MS = 250;
const DOUBLE_TAP_MAX_DISTANCE_PX = 24;
const ZOOM_ANIMATION_MS = 200;

export const ZoomableMedia = ({
  children,
  suppressDoubleTapZoom = false,
  height,
  onInteractionStateChange,
  onZoomStateChange,
  resetToken = 0,
  width,
}: {
  children: React.ReactNode;
  suppressDoubleTapZoom?: boolean;
  height: number;
  onInteractionStateChange?: (isInteracting: boolean) => void;
  onZoomStateChange?: (isZoomed: boolean) => void;
  resetToken?: number;
  width: number;
}) => {
  const zoomRef = React.useRef<ReactZoomPanPinchContentRef>(null);

  const lastTouchEndRef = React.useRef<{
    clientX: number;
    clientY: number;
    time: number;
  } | null>(null);

  const onInteractionStateChangeRef = React.useRef(onInteractionStateChange);
  const onZoomStateChangeRef = React.useRef(onZoomStateChange);
  const previousResetTokenRef = React.useRef(resetToken);
  const [isZoomed, setIsZoomed] = React.useState(false);
  const isZoomedRef = React.useRef(false);
  const isInteractingRef = React.useRef(false);

  React.useEffect(() => {
    onInteractionStateChangeRef.current = onInteractionStateChange;
  }, [onInteractionStateChange]);

  React.useEffect(() => {
    onZoomStateChangeRef.current = onZoomStateChange;
  }, [onZoomStateChange]);

  const updateInteractionState = React.useCallback(
    (nextIsInteracting: boolean) => {
      if (isInteractingRef.current === nextIsInteracting) return;
      isInteractingRef.current = nextIsInteracting;
      onInteractionStateChangeRef.current?.(nextIsInteracting);
    },
    []
  );

  const updateZoomState = React.useCallback((nextIsZoomed: boolean) => {
    if (isZoomedRef.current === nextIsZoomed) return;
    isZoomedRef.current = nextIsZoomed;
    setIsZoomed(nextIsZoomed);
    onZoomStateChangeRef.current?.(nextIsZoomed);
  }, []);

  React.useEffect(() => {
    const zoom = zoomRef.current;

    return () => {
      updateInteractionState(false);
      zoom?.resetTransform(0);
    };
  }, [updateInteractionState]);

  React.useEffect(() => {
    if (resetToken === previousResetTokenRef.current) return;
    previousResetTokenRef.current = resetToken;
    updateInteractionState(false);
    zoomRef.current?.resetTransform(0);
    lastTouchEndRef.current = null;
    updateZoomState(false);
  }, [resetToken, updateInteractionState, updateZoomState]);

  const frameStyle = React.useMemo<React.CSSProperties>(
    () => ({
      alignItems: 'center',
      display: 'flex',
      height,
      justifyContent: 'center',
      width,
    }),
    [height, width]
  );

  const zoomToPoint = React.useCallback((clientX: number, clientY: number) => {
    const zoom = zoomRef.current;
    if (!zoom) return;

    const { positionX, positionY, scale } = zoom.state;

    if (scale > zoomableMediaConstants.ZOOM_THRESHOLD) {
      zoom.resetTransform(ZOOM_ANIMATION_MS);
      return;
    }

    const wrapper = zoom.instance.wrapperComponent;
    const content = zoom.instance.contentComponent;
    const maxScale = zoom.instance.setup.maxScale;

    if (!wrapper || !content) return;

    const nextScale = Math.min(
      zoomableMediaConstants.DOUBLE_TAP_SCALE,
      maxScale
    );

    const contentRect = content.getBoundingClientRect();
    const contentX = (clientX - contentRect.left) / scale;
    const contentY = (clientY - contentRect.top) / scale;

    const targetPositionX = positionX - contentX * (nextScale - scale);
    const targetPositionY = positionY - contentY * (nextScale - scale);

    const wrapperWidth = wrapper.offsetWidth;
    const wrapperHeight = wrapper.offsetHeight;
    const contentWidth = content.offsetWidth * nextScale;
    const contentHeight = content.offsetHeight * nextScale;
    const centerZoomedOut = zoom.instance.setup.centerZoomedOut;

    const minPositionX =
      wrapperWidth > contentWidth && centerZoomedOut
        ? (wrapperWidth - contentWidth) / 2
        : Math.min(0, wrapperWidth - contentWidth);

    const maxPositionX =
      wrapperWidth > contentWidth && centerZoomedOut
        ? (wrapperWidth - contentWidth) / 2
        : 0;

    const minPositionY =
      wrapperHeight > contentHeight && centerZoomedOut
        ? (wrapperHeight - contentHeight) / 2
        : Math.min(0, wrapperHeight - contentHeight);

    const maxPositionY =
      wrapperHeight > contentHeight && centerZoomedOut
        ? (wrapperHeight - contentHeight) / 2
        : 0;

    zoom.setTransform(
      clamp(targetPositionX, minPositionX, maxPositionX),
      clamp(targetPositionY, minPositionY, maxPositionY),
      nextScale,
      ZOOM_ANIMATION_MS
    );
  }, []);

  const handleDoubleClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (suppressDoubleTapZoom) return;
      event.preventDefault();
      updateInteractionState(true);
      zoomToPoint(event.clientX, event.clientY);
      updateInteractionState(false);
    },
    [suppressDoubleTapZoom, updateInteractionState, zoomToPoint]
  );

  const handleTouchEnd = React.useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (suppressDoubleTapZoom) return;

      if (event.changedTouches.length !== 1) {
        lastTouchEndRef.current = null;
        return;
      }

      const touch = event.changedTouches[0];
      const now = Date.now();
      const lastTouchEnd = lastTouchEndRef.current;

      lastTouchEndRef.current = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        time: now,
      };

      if (!lastTouchEnd) return;

      const elapsed = now - lastTouchEnd.time;
      const deltaX = touch.clientX - lastTouchEnd.clientX;
      const deltaY = touch.clientY - lastTouchEnd.clientY;
      const distance = Math.hypot(deltaX, deltaY);

      if (
        elapsed > DOUBLE_TAP_MAX_DELAY_MS ||
        distance > DOUBLE_TAP_MAX_DISTANCE_PX
      ) {
        return;
      }

      event.preventDefault();
      lastTouchEndRef.current = null;
      updateInteractionState(true);
      zoomToPoint(touch.clientX, touch.clientY);
      updateInteractionState(false);
    },
    [suppressDoubleTapZoom, updateInteractionState, zoomToPoint]
  );

  const handlePanningStart = React.useCallback(() => {
    if (!isZoomedRef.current) return;
    lastTouchEndRef.current = null;
    updateInteractionState(true);
  }, [updateInteractionState]);

  const handlePanningStop = React.useCallback(() => {
    if (!isZoomedRef.current) return;
    updateInteractionState(false);
  }, [updateInteractionState]);

  const handlePinchStart = React.useCallback(() => {
    lastTouchEndRef.current = null;
    updateInteractionState(true);
  }, [updateInteractionState]);

  const handlePinchStop = React.useCallback(() => {
    updateInteractionState(false);
  }, [updateInteractionState]);

  return (
    <TransformWrapper
      doubleClick={{ disabled: true }}
      centerOnInit
      centerZoomedOut
      maxScale={4}
      minScale={1}
      onPanningStart={handlePanningStart}
      onPanningStop={handlePanningStop}
      onPinchStart={handlePinchStart}
      onPinchStop={handlePinchStop}
      onTransform={(_, state) =>
        updateZoomState(state.scale > zoomableMediaConstants.ZOOM_THRESHOLD)
      }
      onWheelStart={() => updateInteractionState(true)}
      onWheelStop={() => updateInteractionState(false)}
      onZoomStart={() => updateInteractionState(true)}
      onZoomStop={() => updateInteractionState(false)}
      panning={{ disabled: !isZoomed, velocityDisabled: true }}
      ref={zoomRef}
    >
      <TransformComponent
        contentStyle={frameStyle}
        wrapperProps={{
          onDoubleClick: handleDoubleClick,
          onTouchEnd: handleTouchEnd,
        }}
        wrapperStyle={{ ...frameStyle, touchAction: 'none' }}
      >
        <div style={frameStyle}>{children}</div>
      </TransformComponent>
    </TransformWrapper>
  );
};
