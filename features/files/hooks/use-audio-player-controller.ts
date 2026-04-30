import { useExclusiveFilePlayback } from '@/features/files/hooks/use-exclusive-media-playback';
import * as audioPlaybackRate from '@/features/files/lib/audio-playback-rate';
import { useFileUriToSrc } from '@/features/files/lib/file-uri-to-src';
import type { AudioPlayerProps } from '@/features/files/types/audio-player';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as React from 'react';
import { Platform, type LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

const SEEK_SYNC_TOLERANCE_SECONDS = 0.15;
const SEEK_SETTLE_FALLBACK_MS = 300;
const EXACT_SEEK_TOLERANCE_MS = 0;
type PendingSeek = { id: number; resumePlayback: boolean; seconds: number };

const positiveDuration = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;

type WebAudioPlayer = { media?: HTMLAudioElement };

const useWebAudioMetadataDuration = (player: unknown, src: string | null) => {
  const [metadataDuration, setMetadataDuration] = React.useState<{
    duration: number;
    src: string;
  } | null>(null);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !src || typeof Audio === 'undefined') {
      setMetadataDuration(null);
      return;
    }

    const media = (player as WebAudioPlayer).media;

    if (!media) {
      setMetadataDuration(null);
      return;
    }

    let cancelled = false;

    const syncDuration = () => {
      const nextDuration = positiveDuration(media.duration);
      if (!nextDuration || cancelled) return;
      setMetadataDuration({ duration: nextDuration, src });
    };

    syncDuration();
    media.addEventListener('durationchange', syncDuration);
    media.addEventListener('loadeddata', syncDuration);
    media.addEventListener('loadedmetadata', syncDuration);

    if (!positiveDuration(media.duration)) {
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

export const useAudioPlayerController = ({
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
  const pendingSeekRef = React.useRef<PendingSeek | null>(null);

  const pendingSeekTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const seekRequestIdRef = React.useRef(0);
  const lastAutoPlayKeyRef = React.useRef<number | undefined>(undefined);
  const finishNotifiedRef = React.useRef(false);
  const [displayTime, setDisplayTime] = React.useState(0);

  const [localPlaybackRate, setLocalPlaybackRate] =
    React.useState<audioPlaybackRate.AudioPlaybackRate>(
      audioPlaybackRate.DEFAULT_AUDIO_PLAYBACK_RATE
    );

  const metadataDuration = useWebAudioMetadataDuration(player, src);
  const currentPlaybackRate = playbackRate ?? localPlaybackRate;

  const playerDuration =
    positiveDuration(duration) ??
    metadataDuration ??
    positiveDuration(status.duration) ??
    positiveDuration(player.duration) ??
    0;

  const playbackTime = Math.min(status.currentTime, playerDuration);

  const isPreviewingScrubTime =
    !status.playing && Math.abs(displayTime - playbackTime) > 0.05;

  const timeLabelTime =
    status.playing ||
    isPreviewingScrubTime ||
    isScrubbingRef.current ||
    pendingSeekRef.current
      ? displayTime
      : playerDuration;

  const isPlaying =
    status.playing ||
    (isScrubbingRef.current && wasPlayingBeforeScrub.current) ||
    pendingSeekRef.current?.resumePlayback === true;

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
    useExclusiveFilePlayback(pausePlayback);

  const clearPendingSeekTimeout = React.useCallback(() => {
    if (pendingSeekTimeoutRef.current == null) return;
    clearTimeout(pendingSeekTimeoutRef.current);
    pendingSeekTimeoutRef.current = null;
  }, []);

  const settlePendingSeek = React.useCallback(
    async (seekId: number) => {
      const pendingSeek = pendingSeekRef.current;
      if (!pendingSeek || pendingSeek.id !== seekId) return;
      clearPendingSeekTimeout();
      setDisplayTime(pendingSeek.seconds);

      if (!pendingSeek.resumePlayback) {
        pendingSeekRef.current = null;
        isScrubbingRef.current = false;
        return;
      }

      await claimPlayback();
      if (seekRequestIdRef.current !== seekId) return;
      player.play();
      onPlayStart?.();
    },
    [claimPlayback, clearPendingSeekTimeout, onPlayStart, player]
  );

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
    const pendingSeek = pendingSeekRef.current;
    if (!pendingSeek) return;

    if (
      Math.abs(playbackTime - pendingSeek.seconds) > SEEK_SYNC_TOLERANCE_SECONDS
    ) {
      return;
    }

    void settlePendingSeek(pendingSeek.id);
  }, [playbackTime, settlePendingSeek]);

  React.useEffect(() => {
    if (!status.playing) return;
    pendingSeekRef.current = null;
    clearPendingSeekTimeout();
    isScrubbingRef.current = false;
    wasPlayingBeforeScrub.current = false;
  }, [clearPendingSeekTimeout, status.playing]);

  React.useEffect(() => {
    if (status.playing || isPlaying) return;
    releasePlayback();
  }, [isPlaying, releasePlayback, status.playing]);

  React.useEffect(() => {
    if (!src) return;
    player.setPlaybackRate(currentPlaybackRate, 'high');
  }, [currentPlaybackRate, player, src]);

  React.useEffect(() => {
    if (active || !status.playing) return;
    setDisplayTime(Math.min(status.currentTime, playerDuration));
    player.pause();
  }, [active, player, playerDuration, status.currentTime, status.playing]);

  React.useEffect(() => {
    seekRequestIdRef.current += 1;
    pendingSeekRef.current = null;
    clearPendingSeekTimeout();
    isScrubbingRef.current = false;
    finishNotifiedRef.current = false;
    lastAutoPlayKeyRef.current = undefined;
    setDisplayTime(0);
  }, [clearPendingSeekTimeout, src]);

  React.useEffect(() => clearPendingSeekTimeout, [clearPendingSeekTimeout]);

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
      const seekId = seekRequestIdRef.current + 1;
      seekRequestIdRef.current = seekId;
      pendingSeekRef.current = null;
      clearPendingSeekTimeout();
      isScrubbingRef.current = false;
      setDisplayTime(startTime);

      await player.seekTo(
        startTime,
        EXACT_SEEK_TOLERANCE_MS,
        EXACT_SEEK_TOLERANCE_MS
      );

      if (seekRequestIdRef.current !== seekId) return;
      await claimPlayback();
      if (seekRequestIdRef.current !== seekId) return;
      player.play();
      onPlayStart?.();
    },
    [
      claimPlayback,
      clearPendingSeekTimeout,
      onPlayStart,
      player,
      playerDuration,
      src,
    ]
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
    seekRequestIdRef.current += 1;
    pendingSeekRef.current = null;
    clearPendingSeekTimeout();
    isScrubbingRef.current = false;
    wasPlayingBeforeScrub.current = false;
    player.pause();
    onPause?.();
  }, [clearPendingSeekTimeout, onPause, player]);

  const togglePlayback = React.useCallback(() => {
    isPlaying ? handlePause() : void handlePlay();
  }, [handlePause, handlePlay, isPlaying]);

  const seekToTime = React.useCallback(
    async (seconds: number, resumePlayback: boolean) => {
      const seekSeconds = Math.max(0, Math.min(seconds, playerDuration));
      const seekId = seekRequestIdRef.current + 1;
      seekRequestIdRef.current = seekId;

      pendingSeekRef.current = {
        id: seekId,
        resumePlayback,
        seconds: seekSeconds,
      };

      setDisplayTime(seekSeconds);

      await player.seekTo(
        seekSeconds,
        EXACT_SEEK_TOLERANCE_MS,
        EXACT_SEEK_TOLERANCE_MS
      );

      if (pendingSeekRef.current?.id !== seekId) return;
      clearPendingSeekTimeout();

      pendingSeekTimeoutRef.current = setTimeout(() => {
        void settlePendingSeek(seekId);
      }, SEEK_SETTLE_FALLBACK_MS);
    },
    [clearPendingSeekTimeout, player, playerDuration, settlePendingSeek]
  );

  const seekBy = React.useCallback(
    (secondsDelta: number) => {
      if (!src || playerDuration <= 0) return;
      const baseTime = pendingSeekRef.current?.seconds ?? displayTime;
      const resumePlayback = isPlaying;
      clearPendingSeekTimeout();
      isScrubbingRef.current = false;
      wasPlayingBeforeScrub.current = false;
      if (status.playing) player.pause();
      void seekToTime(baseTime + secondsDelta, resumePlayback);
    },
    [
      clearPendingSeekTimeout,
      displayTime,
      isPlaying,
      player,
      playerDuration,
      seekToTime,
      src,
      status.playing,
    ]
  );

  const startScrub = React.useCallback(() => {
    seekRequestIdRef.current += 1;
    pendingSeekRef.current = null;
    clearPendingSeekTimeout();
    isScrubbingRef.current = true;
    wasPlayingBeforeScrub.current = status.playing;
    if (status.playing) player.pause();
  }, [clearPendingSeekTimeout, player, status.playing]);

  const commitSeek = React.useCallback(
    async (seconds: number) => {
      await seekToTime(seconds, wasPlayingBeforeScrub.current);
    },
    [seekToTime]
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
    isPlaying,
    playerDuration,
    progress,
    seekBy,
    timeLabelTime,
    togglePlayback,
  };
};
