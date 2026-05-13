import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import * as React from 'react';
import { Platform } from 'react-native';

let suppressBrowserHistoryTabSceneAnimation = false;

export const browserHistoryTabSceneStyleInterpolator: NonNullable<
  BottomTabNavigationOptions['sceneStyleInterpolator']
> = ({ current }) => {
  // iOS Safari can paint the previous tab for a frame during native swipe-back.
  // Keep normal tab taps animated, but make browser history pops settle instantly.
  if (suppressBrowserHistoryTabSceneAnimation) {
    return { sceneStyle: { opacity: 1, transform: [{ translateX: 0 }] } };
  }

  return {
    sceneStyle: {
      opacity: current.progress.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [0, 1, 0],
      }),
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [-50, 0, 50],
          }),
        },
      ],
    },
  };
};

export const useBrowserHistoryTabTransition = () => {
  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const clearBrowserHistoryTransition = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }

      suppressBrowserHistoryTabSceneAnimation = false;
    };

    const handlePopState = () => {
      if (timeout) clearTimeout(timeout);
      suppressBrowserHistoryTabSceneAnimation = true;
      timeout = setTimeout(clearBrowserHistoryTransition, 50);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pointerdown', clearBrowserHistoryTransition, true);
    window.addEventListener('touchstart', clearBrowserHistoryTransition, true);

    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener('popstate', handlePopState);

      window.removeEventListener(
        'pointerdown',
        clearBrowserHistoryTransition,
        true
      );

      window.removeEventListener(
        'touchstart',
        clearBrowserHistoryTransition,
        true
      );
    };
  }, []);
};
