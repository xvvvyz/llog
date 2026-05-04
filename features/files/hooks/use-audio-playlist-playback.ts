import { clampIndex } from '@/lib/clamp';
import * as React from 'react';

const DEFAULT_IS_PLAYABLE = () => true;

export const useAudioPlaylistPlayback = <T>(
  items: readonly T[],
  isPlayable: (item: T) => boolean = DEFAULT_IS_PLAYABLE
) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const [autoPlayRequest, setAutoPlayRequest] = React.useState<{
    index: number;
    key: number;
  } | null>(null);

  const autoPlayKeyRef = React.useRef(0);
  const wantsPlaybackRef = React.useRef(false);

  const setWantsPlayback = React.useCallback((value: boolean) => {
    wantsPlaybackRef.current = value;
    if (!value) setAutoPlayRequest(null);
  }, []);

  const requestAutoPlay = React.useCallback((index: number) => {
    autoPlayKeyRef.current += 1;
    setAutoPlayRequest({ index, key: autoPlayKeyRef.current });
  }, []);

  const setActiveIndex = React.useCallback(
    (nextIndex: number) => {
      if (items.length === 0) return;
      const clampedIndex = clampIndex(nextIndex, items.length);
      setWantsPlayback(false);
      setCurrentIndex(clampedIndex);
    },
    [items.length, setWantsPlayback]
  );

  React.useEffect(() => {
    setCurrentIndex((index) => clampIndex(index, items.length));
  }, [items.length]);

  React.useEffect(() => {
    if (items.length === 0) setWantsPlayback(false);
  }, [items.length, setWantsPlayback]);

  const activeIndex = clampIndex(currentIndex, items.length);
  const activeItem = items[activeIndex];

  const moveToIndex = React.useCallback(
    (nextIndex: number) => {
      if (items.length === 0) return;

      const normalizedIndex =
        ((nextIndex % items.length) + items.length) % items.length;

      const shouldContinue = wantsPlaybackRef.current;
      const nextItem = items[normalizedIndex];
      setCurrentIndex(normalizedIndex);
      if (!shouldContinue) return;

      if (nextItem && isPlayable(nextItem)) {
        requestAutoPlay(normalizedIndex);
        return;
      }

      setWantsPlayback(false);
    },
    [isPlayable, items, requestAutoPlay, setWantsPlayback]
  );

  const showPrevious = React.useCallback(() => {
    moveToIndex(activeIndex - 1);
  }, [activeIndex, moveToIndex]);

  const showNext = React.useCallback(() => {
    moveToIndex(activeIndex + 1);
  }, [activeIndex, moveToIndex]);

  const handlePlayStart = React.useCallback(() => {
    setAutoPlayRequest(null);
    setWantsPlayback(true);
  }, [setWantsPlayback]);

  const handlePause = React.useCallback(() => {
    setWantsPlayback(false);
  }, [setWantsPlayback]);

  const handleDidFinish = React.useCallback(
    (index = activeIndex) => {
      const nextPlayableIndex = items.findIndex(
        (item, itemIndex) => itemIndex > index && isPlayable(item)
      );

      if (nextPlayableIndex === -1) {
        setWantsPlayback(false);
        return;
      }

      setWantsPlayback(true);
      setCurrentIndex(nextPlayableIndex);
      requestAutoPlay(nextPlayableIndex);
    },
    [activeIndex, isPlayable, items, requestAutoPlay, setWantsPlayback]
  );

  const activeAutoPlayKey =
    autoPlayRequest?.index === activeIndex &&
    activeItem &&
    isPlayable(activeItem)
      ? autoPlayRequest.key
      : undefined;

  return {
    activeAutoPlayKey,
    activeIndex,
    activeItem,
    currentIndex,
    handleDidFinish,
    handlePause,
    handlePlayStart,
    setActiveIndex,
    showNext,
    showPrevious,
  };
};
