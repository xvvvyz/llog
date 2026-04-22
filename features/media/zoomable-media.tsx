import * as zoomableMediaConstants from '@/features/media/zoomable-media.constants';
import {
  Zoomable,
  type ZoomableRef,
} from '@likashefqet/react-native-image-zoom';
import * as React from 'react';
import { View } from 'react-native';

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
  const zoomRef = React.useRef<ZoomableRef>(null);
  const isZoomedRef = React.useRef(false);
  const isInteractingRef = React.useRef(false);
  const onInteractionStateChangeRef = React.useRef(onInteractionStateChange);
  const onZoomStateChangeRef = React.useRef(onZoomStateChange);
  const previousResetTokenRef = React.useRef(resetToken);

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
    onZoomStateChangeRef.current?.(nextIsZoomed);
  }, []);

  const syncZoomState = React.useCallback(() => {
    const scale = zoomRef.current?.getInfo().transformations.scale ?? 1;
    updateZoomState(scale > zoomableMediaConstants.ZOOM_THRESHOLD);
  }, [updateZoomState]);

  const handleInteractionEnd = React.useCallback(() => {
    updateInteractionState(false);
    syncZoomState();
  }, [syncZoomState, updateInteractionState]);

  React.useEffect(() => {
    return () => {
      updateInteractionState(false);
      zoomRef.current?.reset();
    };
  }, [updateInteractionState]);

  React.useEffect(() => {
    if (resetToken === previousResetTokenRef.current) return;

    previousResetTokenRef.current = resetToken;
    updateInteractionState(false);
    updateZoomState(false);
    zoomRef.current?.reset();
  }, [resetToken, updateInteractionState, updateZoomState]);

  return (
    <View style={{ height, width }}>
      <Zoomable
        doubleTapScale={
          suppressDoubleTapZoom ? 1 : zoomableMediaConstants.DOUBLE_TAP_SCALE
        }
        isDoubleTapEnabled
        maxScale={4}
        minScale={1}
        onInteractionEnd={handleInteractionEnd}
        onInteractionStart={() => updateInteractionState(true)}
        onResetAnimationEnd={() => syncZoomState()}
        ref={zoomRef}
        style={{ height, width }}
      >
        <View className="items-center justify-center" style={{ height, width }}>
          {children}
        </View>
      </Zoomable>
    </View>
  );
};
