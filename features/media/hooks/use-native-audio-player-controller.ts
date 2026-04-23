import { useExclusiveMediaPlayback } from '@/features/media/hooks/use-exclusive-media-playback';
import * as audioPlaybackRate from '@/features/media/lib/audio-playback-rate';
import { useFileUriToSrc } from '@/features/media/lib/file-uri-to-src';
import type { AudioPlayerProps } from '@/features/media/types/audio-player.types';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

export const useNativeAudioPlayerController = ({
  active = true,
  autoPlayKey,
  duration,
  onDidFinish,
  onPause,
  onPlayStart,
  onPlaybackRateChange,
  playbackRate,
  uri,
}: AudioPlayerProps) => {
  const src = useFileUriToSrc(uri);
  const player = useAudioPlayer(src, { updateInterval: 50 });
  const status = useAudioPlayerStatus(player);
  const trackWidth = useSharedValue(0);
  const wasPlayingBeforeScrub = React.useRef(false);
  const isScrubbingRef = React.useRef(false);
  const lastAutoPlayKeyRef = React.useRef<number | undefined>(undefined);
  const finishNotifiedRef = React.useRef(false);
  const [displayTime, setDisplayTime] = React.useState(0);

  const [localPlaybackRate, setLocalPlaybackRate] =
    React.useState<audioPlaybackRate.AudioPlaybackRate>(
      audioPlaybackRate.DEFAULT_AUDIO_PLAYBACK_RATE
    );

  const currentPlaybackRate = playbackRate ?? localPlaybackRate;
  const playerDuration = Math.max(duration ?? status.duration, 0);

  const progress =
    playerDuration > 0
      ? Math.max(0, Math.min(displayTime / playerDuration, 1))
      : 0;

  const handlePlaybackRateChange = React.useCallback(
    (nextPlaybackRate: audioPlaybackRate.AudioPlaybackRate) => {
      onPlaybackRateChange?.(nextPlaybackRate);
      if (!onPlaybackRateChange) setLocalPlaybackRate(nextPlaybackRate);
    },
    [onPlaybackRateChange]
  );

  const pausePlayback = React.useCallback(() => {
    player.pause();
  }, [player]);

  const { claimPlayback, releasePlayback } =
    useExclusiveMediaPlayback(pausePlayback);

  React.useEffect(() => {
    if (isScrubbingRef.current) return;

    if (playerDuration <= 0) {
      setDisplayTime(0);
      return;
    }

    if (status.didJustFinish) {
      setDisplayTime(playerDuration);
      return;
    }

    setDisplayTime(Math.min(status.currentTime, playerDuration));
  }, [playerDuration, status.currentTime, status.didJustFinish]);

  React.useEffect(() => {
    if (!status.playing) releasePlayback();
  }, [releasePlayback, status.playing]);

  React.useEffect(() => {
    if (!src) return;
    player.setPlaybackRate(currentPlaybackRate);
  }, [currentPlaybackRate, player, src]);

  React.useEffect(() => {
    if (active || !status.playing) return;
    setDisplayTime(Math.min(status.currentTime, playerDuration));
    player.pause();
  }, [active, player, playerDuration, status.currentTime, status.playing]);

  React.useEffect(() => {
    finishNotifiedRef.current = false;
    lastAutoPlayKeyRef.current = undefined;
    setDisplayTime(0);
  }, [src]);

  React.useEffect(() => {
    if (!status.didJustFinish) {
      if (
        status.playing ||
        status.currentTime < Math.max(playerDuration - 0.05, 0)
      ) {
        finishNotifiedRef.current = false;
      }

      return;
    }

    if (finishNotifiedRef.current) return;
    finishNotifiedRef.current = true;
    if (active) onDidFinish?.();
  }, [
    active,
    onDidFinish,
    playerDuration,
    status.currentTime,
    status.didJustFinish,
    status.playing,
  ]);

  const playFrom = React.useCallback(
    async (seconds: number) => {
      if (!src) return;

      const startTime = Math.max(0, Math.min(seconds, playerDuration));
      setDisplayTime(startTime);
      await player.seekTo(startTime);
      await claimPlayback();
      player.play();
      onPlayStart?.();
    },
    [claimPlayback, onPlayStart, player, playerDuration, src]
  );

  React.useEffect(() => {
    if (
      !active ||
      autoPlayKey == null ||
      lastAutoPlayKeyRef.current === autoPlayKey
    ) {
      return;
    }

    lastAutoPlayKeyRef.current = autoPlayKey;
    void playFrom(0);
  }, [active, autoPlayKey, playFrom]);

  const handlePlay = React.useCallback(async () => {
    if (!src) return;

    const startTime =
      status.didJustFinish || displayTime >= playerDuration ? 0 : displayTime;

    await playFrom(startTime);
  }, [displayTime, playerDuration, playFrom, src, status.didJustFinish]);

  const handlePause = React.useCallback(() => {
    player.pause();
    onPause?.();
  }, [onPause, player]);

  const togglePlayback = React.useCallback(() => {
    status.playing ? handlePause() : void handlePlay();
  }, [handlePause, handlePlay, status.playing]);

  const startScrub = React.useCallback(() => {
    isScrubbingRef.current = true;
    wasPlayingBeforeScrub.current = status.playing;
    if (status.playing) player.pause();
  }, [player, status.playing]);

  const commitSeek = React.useCallback(
    async (seconds: number) => {
      setDisplayTime(seconds);
      await player.seekTo(seconds);
      isScrubbingRef.current = false;

      if (wasPlayingBeforeScrub.current) {
        await claimPlayback();
        player.play();
        onPlayStart?.();
      }
    },
    [claimPlayback, onPlayStart, player]
  );

  const scrubTo = (x: number) => {
    'worklet';
    if (trackWidth.value <= 0 || playerDuration <= 0) return;
    const fraction = Math.max(0, Math.min(x / trackWidth.value, 1));
    runOnJS(setDisplayTime)(fraction * playerDuration);
  };

  const finishScrub = (x: number) => {
    'worklet';
    if (trackWidth.value <= 0 || playerDuration <= 0) return;
    const fraction = Math.max(0, Math.min(x / trackWidth.value, 1));
    runOnJS(commitSeek)(fraction * playerDuration);
  };

  const tap = Gesture.Tap().onEnd((e) => {
    'worklet';
    runOnJS(startScrub)();
    scrubTo(e.x);
    finishScrub(e.x);
  });

  const pan = Gesture.Pan()
    .onStart((e) => {
      'worklet';
      runOnJS(startScrub)();
      scrubTo(e.x);
    })
    .onUpdate((e) => {
      'worklet';
      scrubTo(e.x);
    })
    .onEnd((e) => {
      'worklet';
      finishScrub(e.x);
    });

  const gesture = Gesture.Race(pan, tap);

  const handleTrackLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      trackWidth.value = event.nativeEvent.layout.width;
    },
    [trackWidth]
  );

  return {
    currentPlaybackRate,
    displayTime,
    gesture,
    handlePlaybackRateChange,
    handleTrackLayout,
    isDisabled: !src,
    isPlaying: status.playing,
    playerDuration,
    progress,
    togglePlayback,
  };
};
