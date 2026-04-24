import * as mediaLightboxAnimation from '@/features/media/lib/lightbox-animation';
import * as React from 'react';
import { useWindowDimensions } from 'react-native';

import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export const useMediaLightboxTransition = ({
  mediaId,
  onCloseAnimationEnd,
  onRequestClose,
}: {
  mediaId?: string;
  onCloseAnimationEnd?: () => void;
  onRequestClose: () => void;
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const [isClosing, setIsClosing] = React.useState(false);
  const [isModalVisible, setIsModalVisible] = React.useState(!!mediaId);
  const [renderedMediaId, setRenderedMediaId] = React.useState(mediaId);

  const closeAnimationModeRef =
    React.useRef<mediaLightboxAnimation.CloseAnimationMode>('animated');

  const closeDirectionRef =
    React.useRef<mediaLightboxAnimation.DismissDirection>(1);

  const translateY = useSharedValue(0);
  const backgroundOpacity = useSharedValue(mediaId ? 1 : 0);
  const mediaOpacity = useSharedValue(mediaId ? 1 : 0);
  const overlayOpacity = useSharedValue(mediaId ? 1 : 0);

  const animatedValues =
    React.useMemo<mediaLightboxAnimation.MediaLightboxAnimatedValues>(
      () => ({ backgroundOpacity, mediaOpacity, overlayOpacity, translateY }),
      [backgroundOpacity, mediaOpacity, overlayOpacity, translateY]
    );

  const dismissThreshold = React.useMemo(
    () => mediaLightboxAnimation.getDismissThreshold(windowHeight),
    [windowHeight]
  );

  const dragFadeDistance = React.useMemo(
    () => mediaLightboxAnimation.getDragFadeDistance(windowHeight),
    [windowHeight]
  );

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const finishCloseAnimation = React.useCallback(() => {
    setIsClosing(false);
    setIsModalVisible(false);
    setRenderedMediaId(undefined);
    closeAnimationModeRef.current = 'animated';
    onCloseAnimationEnd?.();
  }, [onCloseAnimationEnd]);

  const requestClose = React.useCallback(
    ({
      animation = 'animated',
      direction = 1,
    }: {
      animation?: mediaLightboxAnimation.CloseAnimationMode;
      direction?: mediaLightboxAnimation.DismissDirection;
    } = {}) => {
      if (isClosing) return;
      closeAnimationModeRef.current = animation;
      closeDirectionRef.current = direction;
      onRequestClose();
    },
    [isClosing, onRequestClose]
  );

  const handleAnimatedRequestClose = React.useCallback(
    (direction: mediaLightboxAnimation.DismissDirection = 1) => {
      requestClose({ animation: 'animated', direction });
    },
    [requestClose]
  );

  const handleInstantRequestClose = React.useCallback(() => {
    requestClose({ animation: 'instant', direction: 1 });
  }, [requestClose]);

  const isVisible = !!mediaId;

  React.useEffect(() => {
    if (!mediaId) return;
    setRenderedMediaId(mediaId);
  }, [mediaId]);

  React.useEffect(() => {
    if (isVisible && mediaId) {
      setRenderedMediaId(mediaId);
      setIsClosing(false);
      setIsModalVisible(true);
      mediaLightboxAnimation.setLightboxOpenValues(animatedValues);
      return;
    }

    if (!isModalVisible || !renderedMediaId) return;

    if (closeAnimationModeRef.current === 'instant') {
      mediaLightboxAnimation.setLightboxClosedValues(animatedValues);
      finishCloseAnimation();
      return;
    }

    setIsClosing(true);
    mediaLightboxAnimation.fadeOutLightboxForClose(animatedValues);

    translateY.value = withTiming(
      mediaLightboxAnimation.getExitTranslation(
        windowHeight,
        closeDirectionRef.current
      ),
      {
        duration: mediaLightboxAnimation.CLOSE_ANIMATION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (!finished) return;
        runOnJS(finishCloseAnimation)();
      }
    );
  }, [
    animatedValues,
    finishCloseAnimation,
    isModalVisible,
    isVisible,
    mediaId,
    renderedMediaId,
    translateY,
    windowHeight,
  ]);

  return {
    animatedValues,
    backgroundStyle,
    dismissThreshold,
    dragFadeDistance,
    handleAnimatedRequestClose,
    handleInstantRequestClose,
    isClosing,
    isModalVisible,
    isVisible,
    overlayStyle,
    renderedMediaId,
  };
};
