import * as React from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

export const useHideOnScrollDown = () => {
  const [isVisible, setIsVisible] = React.useState(true);
  const scrollAccumulated = React.useRef(0);
  const scrollDirection = React.useRef<'up' | 'down'>('down');
  const scrollOffsetLast = React.useRef(0);

  const onScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollOffsetCurrent = event.nativeEvent.contentOffset.y;
      const scrollDelta = scrollOffsetCurrent - scrollOffsetLast.current;
      const scrollDirectionCurrent = scrollDelta >= 0 ? 'down' : 'up';

      const isAtTop = scrollOffsetCurrent <= 0;

      const isAtBottom =
        scrollOffsetCurrent >=
        event.nativeEvent.contentSize.height -
          event.nativeEvent.layoutMeasurement.height;

      if (isAtTop || isAtBottom) {
        scrollOffsetLast.current = scrollOffsetCurrent;
        return;
      }

      if (scrollDirectionCurrent !== scrollDirection.current) {
        scrollDirection.current = scrollDirectionCurrent;
        scrollAccumulated.current = 0;
      }

      if (scrollDirectionCurrent) {
        scrollAccumulated.current += Math.abs(scrollDelta);

        if (
          scrollDirectionCurrent === 'down' &&
          scrollAccumulated.current > 25
        ) {
          setIsVisible(false);
          scrollAccumulated.current = 0;
        } else if (
          scrollDirectionCurrent === 'up' &&
          scrollAccumulated.current > 25
        ) {
          setIsVisible(true);
          scrollAccumulated.current = 0;
        }
      }

      scrollOffsetLast.current = scrollOffsetCurrent;
    },
    []
  );

  return { isVisible, onScroll };
};
