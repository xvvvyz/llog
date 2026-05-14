import { positiveDurationSeconds } from '@/lib/duration';
import * as React from 'react';
import { Platform } from 'react-native';
import type { AudioPlayer } from 'expo-audio';

type WebAudioPlayer = AudioPlayer & { media?: HTMLAudioElement };

type WebPlaybackSnapshot = {
  currentTime: number;
  ended: boolean;
  playing: boolean;
  src: string;
};

export const getWebMediaElement = (player: AudioPlayer) => {
  if (Platform.OS !== 'web') return null;
  return (player as WebAudioPlayer).media ?? null;
};

const readWebPlaybackSnapshot = (
  media: HTMLAudioElement,
  src: string
): WebPlaybackSnapshot => ({
  currentTime: Number.isFinite(media.currentTime) ? media.currentTime : 0,
  ended: media.ended,
  playing: !media.paused && !media.ended,
  src,
});

const isSameWebPlaybackSnapshot = (
  previousSnapshot: WebPlaybackSnapshot | null,
  nextSnapshot: WebPlaybackSnapshot
) =>
  previousSnapshot?.src === nextSnapshot.src &&
  previousSnapshot.currentTime === nextSnapshot.currentTime &&
  previousSnapshot.ended === nextSnapshot.ended &&
  previousSnapshot.playing === nextSnapshot.playing;

export const useWebAudioMetadataDuration = (
  player: AudioPlayer,
  src: string | null
) => {
  const [metadataDuration, setMetadataDuration] = React.useState<{
    duration: number;
    src: string;
  } | null>(null);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !src || typeof Audio === 'undefined') {
      setMetadataDuration(null);
      return;
    }

    const media = getWebMediaElement(player);

    if (!media) {
      setMetadataDuration(null);
      return;
    }

    let cancelled = false;

    const syncDuration = () => {
      const nextDuration = positiveDurationSeconds(media.duration);
      if (!nextDuration || cancelled) return;
      setMetadataDuration({ duration: nextDuration, src });
    };

    syncDuration();
    media.addEventListener('durationchange', syncDuration);
    media.addEventListener('loadeddata', syncDuration);
    media.addEventListener('loadedmetadata', syncDuration);

    if (!positiveDurationSeconds(media.duration)) {
      media.preload = 'metadata';
      media.load();
    }

    return () => {
      cancelled = true;
      media.removeEventListener('durationchange', syncDuration);
      media.removeEventListener('loadeddata', syncDuration);
      media.removeEventListener('loadedmetadata', syncDuration);
    };
  }, [player, src]);

  return metadataDuration?.src === src ? metadataDuration.duration : undefined;
};

export const useWebAudioPlaybackSnapshot = (
  player: AudioPlayer,
  src: string | null,
  isPlaybackRequested: boolean
) => {
  const [snapshot, setSnapshot] = React.useState<WebPlaybackSnapshot | null>(
    null
  );

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !src || typeof Audio === 'undefined') {
      setSnapshot(null);
      return;
    }

    const media = getWebMediaElement(player);

    if (!media) {
      setSnapshot(null);
      return;
    }

    let animationFrame: number | null = null;
    let cancelled = false;

    const syncSnapshot = () => {
      if (cancelled) return;
      const nextSnapshot = readWebPlaybackSnapshot(media, src);

      setSnapshot((previousSnapshot) =>
        isSameWebPlaybackSnapshot(previousSnapshot, nextSnapshot)
          ? previousSnapshot
          : nextSnapshot
      );
    };

    const stopAnimationFrame = () => {
      if (animationFrame == null) return;
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    };

    const tick = () => {
      animationFrame = null;
      syncSnapshot();

      if (!cancelled && !media.paused && !media.ended) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    const ensureAnimationFrame = () => {
      if (animationFrame != null) return;
      animationFrame = requestAnimationFrame(tick);
    };

    const syncAndUpdateAnimation = () => {
      syncSnapshot();

      if (!media.paused && !media.ended) ensureAnimationFrame();
      else if (!isPlaybackRequested) stopAnimationFrame();
    };

    syncAndUpdateAnimation();
    if (isPlaybackRequested) ensureAnimationFrame();
    media.addEventListener('ended', syncAndUpdateAnimation);
    media.addEventListener('pause', syncAndUpdateAnimation);
    media.addEventListener('play', syncAndUpdateAnimation);
    media.addEventListener('playing', syncAndUpdateAnimation);
    media.addEventListener('seeked', syncAndUpdateAnimation);
    media.addEventListener('timeupdate', syncSnapshot);

    return () => {
      cancelled = true;
      stopAnimationFrame();
      media.removeEventListener('ended', syncAndUpdateAnimation);
      media.removeEventListener('pause', syncAndUpdateAnimation);
      media.removeEventListener('play', syncAndUpdateAnimation);
      media.removeEventListener('playing', syncAndUpdateAnimation);
      media.removeEventListener('seeked', syncAndUpdateAnimation);
      media.removeEventListener('timeupdate', syncSnapshot);
    };
  }, [isPlaybackRequested, player, src]);

  return snapshot?.src === src ? snapshot : null;
};
