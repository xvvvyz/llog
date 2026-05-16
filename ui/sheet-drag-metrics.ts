import * as React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as sheetDragConstants from '@/ui/sheet-drag-constants';

export type SheetDragMetrics = {
  dismissThreshold: number;
  exitTranslation: number;
  translateY: SharedValue<number>;
};

const getSheetDismissThreshold = (windowHeight: number) =>
  Math.min(
    sheetDragConstants.SHEET_DISMISS_THRESHOLD_MAX_PX,
    Math.max(
      sheetDragConstants.SHEET_DISMISS_THRESHOLD_MIN_PX,
      windowHeight * sheetDragConstants.SHEET_DISMISS_THRESHOLD_RATIO
    )
  );

const getSheetExitTranslation = (windowHeight: number) =>
  Math.max(
    sheetDragConstants.SHEET_EXIT_TRANSLATION_MIN_PX,
    windowHeight * sheetDragConstants.SHEET_EXIT_TRANSLATION_RATIO
  );

export const getSheetDragOpacity = (
  translationY: number,
  fadeDistance: number
) => {
  'worklet';
  const distance = Math.max(fadeDistance, 1);
  const progress = Math.min(Math.max(translationY, 0), distance) / distance;
  return 1 - progress;
};

export const useSheetBackdropDragStyle = (
  translateY?: SharedValue<number>,
  fadeDistance = sheetDragConstants.SHEET_DISMISS_THRESHOLD_MIN_PX
) =>
  useAnimatedStyle(() => {
    const translationY = translateY ? translateY.value : 0;
    return { opacity: getSheetDragOpacity(translationY, fadeDistance) };
  });

export const useSheetDragMetrics = (windowHeight: number): SheetDragMetrics => {
  const translateY = useSharedValue(0);

  const dismissThreshold = React.useMemo(
    () => getSheetDismissThreshold(windowHeight),
    [windowHeight]
  );

  const exitTranslation = React.useMemo(
    () => getSheetExitTranslation(windowHeight),
    [windowHeight]
  );

  return { dismissThreshold, exitTranslation, translateY };
};
