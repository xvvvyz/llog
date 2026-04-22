import * as zoomableMediaConstants from '@/features/media/zoomable-media.constants';
import * as React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  ResumableZoom,
  type ResumableZoomRefType,
} from 'react-native-zoom-toolkit';

export const ZoomableMedia = ({
  children,
  disabledDoubleTapZoom = false,
  height,
  onInteractionStateChange,
  onZoomStateChange,
  resetToken = 0,
  width,
}: {
  children: React.ReactNode;
  disabledDoubleTapZoom?: boolean;
  height: number;
  onInteractionStateChange?: (isInteracting: boolean) => void;
  onZoomStateChange?: (isZoomed: boolean) => void;
  resetToken?: number;
  width: number;
}) => {
  const zoomRef = React.useRef<ResumableZoomRefType>(null);
  const isZoomedRef = React.useRef(false);
  const isInteractingRef = React.useRef(false);
  const onInteractionStateChangeRef = React.useRef(onInteractionStateChange);
  const onZoomStateChangeRef = React.useRef(onZoomStateChange);
  const previousResetTokenRef = React.useRef(resetToken);
  const [isZoomed, setIsZoomed] = React.useState(false);

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

  const syncZoomState = React.useCallback(() => {
    const scale = zoomRef.current?.getState().scale ?? 1;
    updateZoomState(scale > zoomableMediaConstants.ZOOM_THRESHOLD);
  }, [updateZoomState]);

  const handleDoubleTap = React.useCallback(
    (x: number, y: number) => {
      if (disabledDoubleTapZoom) return;

      const zoom = zoomRef.current;
      if (!zoom) return;

      const { maxScale, scale } = zoom.getState();

      if (scale > zoomableMediaConstants.ZOOM_THRESHOLD) {
        zoom.reset();
        updateZoomState(false);
        return;
      }

      updateInteractionState(true);
      const nextScale = Math.min(
        zoomableMediaConstants.DOUBLE_TAP_SCALE,
        maxScale
      );
      zoom.zoom(nextScale, { x, y });
      updateZoomState(nextScale > zoomableMediaConstants.ZOOM_THRESHOLD);
      updateInteractionState(false);
    },
    [disabledDoubleTapZoom, updateInteractionState, updateZoomState]
  );

  const doubleTap = React.useMemo(
    () =>
      Gesture.Tap()
        .enabled(!disabledDoubleTapZoom)
        .maxDuration(250)
        .numberOfTaps(2)
        .runOnJS(true)
        .onEnd((event) => {
          handleDoubleTap(event.x, event.y);
        }),
    [disabledDoubleTapZoom, handleDoubleTap]
  );

  React.useEffect(() => {
    const zoom = zoomRef.current;

    return () => {
      updateInteractionState(false);
      zoom?.reset(false);
    };
  }, [updateInteractionState]);

  React.useEffect(() => {
    if (resetToken === previousResetTokenRef.current) return;

    previousResetTokenRef.current = resetToken;
    updateInteractionState(false);
    zoomRef.current?.reset(false);
    updateZoomState(false);
  }, [resetToken, updateInteractionState, updateZoomState]);

  return (
    <GestureDetector gesture={doubleTap}>
      <View style={{ height, width }}>
        <ResumableZoom
          maxScale={4}
          minScale={1}
          onGestureEnd={syncZoomState}
          onPanEnd={() => updateInteractionState(false)}
          onPanStart={() => updateInteractionState(true)}
          onPinchEnd={() => updateInteractionState(false)}
          onPinchStart={() => updateInteractionState(true)}
          panEnabled={isZoomed}
          ref={zoomRef}
          style={{ height, width }}
          tapsEnabled={false}
        >
          <View
            className="items-center justify-center"
            style={{ height, width }}
          >
            {children}
          </View>
        </ResumableZoom>
      </View>
    </GestureDetector>
  );
};
