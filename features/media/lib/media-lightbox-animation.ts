import {
  cancelAnimation,
  Easing,
  type SharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export const CLOSE_ANIMATION_DURATION_MS = 220;
export const CLOSE_CONTENT_FADE_DURATION_MS = 80;
export const DISMISS_OVERLAY_FADE_DURATION_MS = 55;
export const DISMISS_CHROME_FADE_DURATION_MS = 80;
export const DISMISS_ACTIVE_OFFSET_Y = 10;
export const DISMISS_FAIL_OFFSET_X = 24;
export const DISMISS_THRESHOLD_MAX_PX = 160;
export const DISMISS_THRESHOLD_MIN_PX = 96;
export const DISMISS_THRESHOLD_RATIO = 0.14;
export const DISMISS_VELOCITY_THRESHOLD = 900;
export const DRAG_FADE_DISTANCE_MIN_PX = 88;
export const DRAG_FADE_DISTANCE_RATIO = 0.12;
export const DRAG_CHROME_FADE_DISTANCE_MULTIPLIER = 0.85;
export const DRAG_MEDIA_FADE_DISTANCE_MULTIPLIER = 1;
export const EXIT_TRANSLATION_MIN_PX = 240;
export const EXIT_TRANSLATION_RATIO = 0.35;
export const RESET_CHROME_FADE_DURATION_MS = 140;
export const RESET_MEDIA_FADE_DURATION_MS = 180;
export const SPRING_CONFIG = { damping: 26, mass: 1, stiffness: 260 };

export type CloseAnimationMode = 'animated' | 'instant';
export type DismissDirection = -1 | 1;

export type MediaLightboxAnimatedValues = {
  backgroundOpacity: SharedValue<number>;
  mediaOpacity: SharedValue<number>;
  overlayOpacity: SharedValue<number>;
  translateY: SharedValue<number>;
};

export const getDismissThreshold = (windowHeight: number) =>
  Math.min(
    DISMISS_THRESHOLD_MAX_PX,
    Math.max(DISMISS_THRESHOLD_MIN_PX, windowHeight * DISMISS_THRESHOLD_RATIO)
  );

export const getDragFadeDistance = (windowHeight: number) =>
  Math.max(DRAG_FADE_DISTANCE_MIN_PX, windowHeight * DRAG_FADE_DISTANCE_RATIO);

export const getExitTranslation = (
  windowHeight: number,
  direction: DismissDirection
) =>
  direction *
  Math.max(EXIT_TRANSLATION_MIN_PX, windowHeight * EXIT_TRANSLATION_RATIO);

export const cancelLightboxAnimations = ({
  backgroundOpacity,
  mediaOpacity,
  overlayOpacity,
  translateY,
}: MediaLightboxAnimatedValues) => {
  cancelAnimation(backgroundOpacity);
  cancelAnimation(mediaOpacity);
  cancelAnimation(overlayOpacity);
  cancelAnimation(translateY);
};

export const setLightboxOpenValues = (
  animatedValues: MediaLightboxAnimatedValues
) => {
  cancelLightboxAnimations(animatedValues);
  animatedValues.backgroundOpacity.value = 1;
  animatedValues.mediaOpacity.value = 1;
  animatedValues.overlayOpacity.value = 1;
  animatedValues.translateY.value = 0;
};

export const setLightboxClosedValues = (
  animatedValues: MediaLightboxAnimatedValues
) => {
  cancelLightboxAnimations(animatedValues);
  animatedValues.backgroundOpacity.value = 0;
  animatedValues.mediaOpacity.value = 0;
  animatedValues.overlayOpacity.value = 0;
  animatedValues.translateY.value = 0;
};

export const fadeOutLightboxForClose = ({
  backgroundOpacity,
  mediaOpacity,
  overlayOpacity,
}: MediaLightboxAnimatedValues) => {
  backgroundOpacity.value = withTiming(0, {
    duration: DISMISS_CHROME_FADE_DURATION_MS,
    easing: Easing.linear,
  });

  overlayOpacity.value = withTiming(0, {
    duration: CLOSE_CONTENT_FADE_DURATION_MS,
    easing: Easing.linear,
  });

  mediaOpacity.value = withTiming(0, {
    duration: CLOSE_CONTENT_FADE_DURATION_MS,
    easing: Easing.linear,
  });
};

export const resetDismissAnimation = ({
  backgroundOpacity,
  mediaOpacity,
  overlayOpacity,
  translateY,
}: MediaLightboxAnimatedValues) => {
  'worklet';

  translateY.value = withSpring(0, SPRING_CONFIG);

  backgroundOpacity.value = withTiming(1, {
    duration: RESET_CHROME_FADE_DURATION_MS,
    easing: Easing.out(Easing.quad),
  });

  mediaOpacity.value = withTiming(1, {
    duration: RESET_MEDIA_FADE_DURATION_MS,
    easing: Easing.out(Easing.quad),
  });

  overlayOpacity.value = withTiming(1, {
    duration: RESET_MEDIA_FADE_DURATION_MS,
    easing: Easing.out(Easing.quad),
  });
};

export const isDismissAnimationSettled = ({
  backgroundOpacity,
  mediaOpacity,
  overlayOpacity,
  translateY,
}: MediaLightboxAnimatedValues) => {
  'worklet';

  return (
    translateY.value === 0 &&
    backgroundOpacity.value === 1 &&
    mediaOpacity.value === 1 &&
    overlayOpacity.value === 1
  );
};

const getLinearFadeOpacity = (distance: number, fadeDistance: number) => {
  'worklet';

  const clampedFadeDistance = Math.max(fadeDistance, 1);
  const fadeProgress = Math.min(Math.max(distance, 0), clampedFadeDistance);

  return 1 - fadeProgress / clampedFadeDistance;
};

export const getDragMediaOpacity = (
  translationY: number,
  dragFadeDistance: number
) => {
  'worklet';

  return getLinearFadeOpacity(
    Math.abs(translationY),
    dragFadeDistance * DRAG_MEDIA_FADE_DISTANCE_MULTIPLIER
  );
};

export const getDragChromeOpacity = (
  translationY: number,
  dragFadeDistance: number
) => {
  'worklet';

  return getLinearFadeOpacity(
    Math.abs(translationY),
    dragFadeDistance * DRAG_CHROME_FADE_DISTANCE_MULTIPLIER
  );
};
