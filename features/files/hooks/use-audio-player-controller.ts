import { useExclusiveFilePlayback } from '@/features/files/hooks/use-exclusive-media-playback';
import * as fileUriSources from '@/features/files/lib/file-uri-to-src';
import * as audioPlaybackRate from '@/features/files/lib/media-playback-rate';
import type { AudioPlayerProps } from '@/features/files/types/audio-player';
import { clamp } from '@/lib/clamp';
import { positiveDurationSeconds } from '@/lib/duration';
import * as React from 'react';
import { Platform } from 'react-native';

import {
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioPlayer,
} from 'expo-audio';

const SEEK_SYNC_TOLERANCE_SECONDS = 0.15;
const EXACT_SEEK_TOLERANCE_MS = 0;
const PLAYBACK_REQUEST_PAUSE_GRACE_MS = 1500;
type PendingSeek = { id: number; resumePlayback: boolean; seconds: number };
type WebAudioPlayer = AudioPlayer & { media?: HTMLAudioElement };

const getWebMediaElement = (player: AudioPlayer) => {
  if (Platform.OS !== 'web') return null;
  return (player as WebAudioPlayer).media ?? null;
};

const useWebAudioMetadataDuration = (
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

export const useAudioPlayerController = ({
  active = true,
  autoPlayKey,
  durationSeconds,
  onDidFinish,
  onPause,
  onPlayStart,
  onPlaybackRateChange,
  playbackRate,
  assetKey,
  uri,
}: AudioPlayerProps) => {
  const src = fileUriSources.useFileUriToSrc(
    fileUriSources.getFileSourceUri({ assetKey, uri })
  );

  const player = useAudioPlayer(src, { updateInterval: 50 });
  const status = useAudioPlayerStatus(player);
  const wasPlayingBeforeScrub = React.useRef(false);
  const isScrubbingRef = React.useRef(false);
  const pendingSeekRef = React.useRef<PendingSeek | null>(null);
  const seekRequestIdRef = React.useRef(0);
  const lastAutoPlayKeyRef = React.useRef<number | undefined>(undefined);
  const lastPlaybackRequestAtRef = React.useRef(0);
  const finishNotifiedRef = React.useRef(false);
  const hasObservedPlaybackRef = React.useRef(false);
  const [displayTime, setDisplayTime] = React.useState(0);
  const [isPlaybackRequested, setIsPlaybackRequested] = React.useState(false);

  const [pendingPlaybackTime, setPendingPlaybackTime] = React.useState<
    number | null
  >(null);

  const [localPlaybackRate, setLocalPlaybackRate] =
    React.useState<audioPlaybackRate.AudioPlaybackRate>(
      audioPlaybackRate.DEFAULT_AUDIO_PLAYBACK_RATE
    );

  const metadataDuration = useWebAudioMetadataDuration(player, src);
  const currentPlaybackRate = playbackRate ?? localPlaybackRate;

  const playerDuration =
    positiveDurationSeconds(durationSeconds) ??
    metadataDuration ??
    positiveDurationSeconds(status.duration) ??
    positiveDurationSeconds(player.duration) ??
    0;

  const playbackTime = Math.min(status.currentTime, playerDuration);

  const isPreviewingScrubTime =
    !status.playing && Math.abs(displayTime - playbackTime) > 0.05;

  const hasPausedProgress = !status.playing && displayTime > 0.05;

  const timeLabelTime =
    status.playing ||
    hasPausedProgress ||
    isPreviewingScrubTime ||
    isScrubbingRef.current ||
    pendingSeekRef.current
      ? displayTime
      : playerDuration;

  const isPlaying =
    isPlaybackRequested ||
    status.playing ||
    (isScrubbingRef.current && wasPlayingBeforeScrub.current) ||
    pendingSeekRef.current?.resumePlayback === true;

  const progress =
    playerDuration > 0 ? clamp(displayTime / playerDuration, 0, 1) : 0;

  const handlePlaybackRateChange = React.useCallback(
    (nextPlaybackRate: audioPlaybackRate.AudioPlaybackRate) => {
      onPlaybackRateChange?.(nextPlaybackRate);
      if (!onPlaybackRateChange) setLocalPlaybackRate(nextPlaybackRate);
    },
    [onPlaybackRateChange]
  );

  const requestPlayback = React.useCallback(() => {
    lastPlaybackRequestAtRef.current = Date.now();
    setIsPlaybackRequested(true);
  }, []);

  const pausePlayback = React.useCallback(() => {
    setIsPlaybackRequested(false);
    setPendingPlaybackTime(null);
    player.pause();
  }, [player]);

  const { claimPlayback, releasePlayback } =
    useExclusiveFilePlayback(pausePlayback);

  const settlePendingSeek = React.useCallback(
    async (seekId: number) => {
      const pendingSeek = pendingSeekRef.current;
      if (!pendingSeek || pendingSeek.id !== seekId) return;
      setDisplayTime(pendingSeek.seconds);
      pendingSeekRef.current = null;
      isScrubbingRef.current = false;
      setPendingPlaybackTime(null);
      if (!pendingSeek.resumePlayback) return;
      await claimPlayback();
      if (seekRequestIdRef.current !== seekId) return;
      requestPlayback();
      player.play();
      onPlayStart?.();
    },
    [claimPlayback, onPlayStart, player, requestPlayback]
  );

  const shouldSettleSeekAfterNativeCall = React.useCallback(
    (seconds: number) => {
      if (Platform.OS !== 'web') return true;

      const currentTime = Number.isFinite(player.currentTime)
        ? player.currentTime
        : playbackTime;

      return Math.abs(currentTime - seconds) <= SEEK_SYNC_TOLERANCE_SECONDS;
    },
    [playbackTime, player]
  );

  React.useEffect(() => {
    if (isScrubbingRef.current) return;
    if (pendingSeekRef.current) return;
    if (pendingPlaybackTime != null) return;

    if (playerDuration <= 0) {
      setDisplayTime(0);
      return;
    }

    if (status.didJustFinish) {
      setDisplayTime(playerDuration);
      return;
    }

    setDisplayTime(Math.min(status.currentTime, playerDuration));
  }, [
    pendingPlaybackTime,
    playerDuration,
    status.currentTime,
    status.didJustFinish,
  ]);

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
    hasObservedPlaybackRef.current = true;
    if (pendingPlaybackTime != null) return;
    if (pendingSeekRef.current) return;
    isScrubbingRef.current = false;
    wasPlayingBeforeScrub.current = false;
  }, [pendingPlaybackTime, status.playing]);

  React.useEffect(() => {
    const shouldClearInterruptedPlaybackRequest = () => {
      if (status.playing || !isPlaybackRequested) return false;
      if (!hasObservedPlaybackRef.current) return false;
      if (pendingPlaybackTime != null) return false;
      if (pendingSeekRef.current) return false;
      if (isScrubbingRef.current) return false;
      if (status.didJustFinish) return false;

      if (status.isBuffering || status.timeControlStatus === 'waiting') {
        return false;
      }

      return true;
    };

    if (!shouldClearInterruptedPlaybackRequest()) return;

    const remainingGraceTime =
      PLAYBACK_REQUEST_PAUSE_GRACE_MS -
      (Date.now() - lastPlaybackRequestAtRef.current);

    const clearPlaybackRequest = () => {
      if (!shouldClearInterruptedPlaybackRequest()) return;
      setIsPlaybackRequested(false);
      setPendingPlaybackTime(null);
      wasPlayingBeforeScrub.current = false;
    };

    if (remainingGraceTime <= 0) {
      clearPlaybackRequest();
      return;
    }

    const timeout = setTimeout(clearPlaybackRequest, remainingGraceTime);
    return () => clearTimeout(timeout);
  }, [
    isPlaybackRequested,
    pendingPlaybackTime,
    status.didJustFinish,
    status.isBuffering,
    status.playing,
    status.timeControlStatus,
  ]);

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
    setIsPlaybackRequested(false);
    setPendingPlaybackTime(null);
    player.pause();
  }, [active, player, playerDuration, status.currentTime, status.playing]);

  React.useEffect(() => {
    seekRequestIdRef.current += 1;
    pendingSeekRef.current = null;
    isScrubbingRef.current = false;
    finishNotifiedRef.current = false;
    hasObservedPlaybackRef.current = false;
    lastAutoPlayKeyRef.current = undefined;
    lastPlaybackRequestAtRef.current = 0;
    setIsPlaybackRequested(false);
    setPendingPlaybackTime(null);
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

    if (!hasObservedPlaybackRef.current || finishNotifiedRef.current) return;
    finishNotifiedRef.current = true;
    hasObservedPlaybackRef.current = false;
    setIsPlaybackRequested(false);
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
      const startTime = clamp(seconds, 0, playerDuration);
      const seekId = seekRequestIdRef.current + 1;
      seekRequestIdRef.current = seekId;

      pendingSeekRef.current = {
        id: seekId,
        resumePlayback: true,
        seconds: startTime,
      };

      isScrubbingRef.current = false;
      requestPlayback();
      setDisplayTime(startTime);
      setPendingPlaybackTime(startTime);

      await player.seekTo(
        startTime,
        EXACT_SEEK_TOLERANCE_MS,
        EXACT_SEEK_TOLERANCE_MS
      );

      if (pendingSeekRef.current?.id !== seekId) return;

      if (shouldSettleSeekAfterNativeCall(startTime)) {
        void settlePendingSeek(seekId);
      }
    },
    [
      player,
      playerDuration,
      requestPlayback,
      settlePendingSeek,
      shouldSettleSeekAfterNativeCall,
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
    isScrubbingRef.current = false;
    wasPlayingBeforeScrub.current = false;
    setIsPlaybackRequested(false);
    setPendingPlaybackTime(null);
    player.pause();
    onPause?.();
  }, [onPause, player]);

  const togglePlayback = React.useCallback(() => {
    isPlaying ? handlePause() : void handlePlay();
  }, [handlePause, handlePlay, isPlaying]);

  const seekToTime = React.useCallback(
    async (seconds: number, resumePlayback: boolean) => {
      const seekSeconds = clamp(seconds, 0, playerDuration);
      const seekId = seekRequestIdRef.current + 1;
      seekRequestIdRef.current = seekId;

      pendingSeekRef.current = {
        id: seekId,
        resumePlayback,
        seconds: seekSeconds,
      };

      if (resumePlayback) {
        requestPlayback();
      } else {
        setIsPlaybackRequested(false);
      }

      setDisplayTime(seekSeconds);
      setPendingPlaybackTime(resumePlayback ? seekSeconds : null);

      await player.seekTo(
        seekSeconds,
        EXACT_SEEK_TOLERANCE_MS,
        EXACT_SEEK_TOLERANCE_MS
      );

      if (pendingSeekRef.current?.id !== seekId) return;

      if (shouldSettleSeekAfterNativeCall(seekSeconds)) {
        void settlePendingSeek(seekId);
      }
    },
    [
      player,
      playerDuration,
      requestPlayback,
      settlePendingSeek,
      shouldSettleSeekAfterNativeCall,
    ]
  );

  const seekBy = React.useCallback(
    (secondsDelta: number) => {
      if (!src || playerDuration <= 0) return;
      const baseTime = pendingSeekRef.current?.seconds ?? displayTime;
      const resumePlayback = isPlaying;
      isScrubbingRef.current = false;
      wasPlayingBeforeScrub.current = false;
      void seekToTime(baseTime + secondsDelta, resumePlayback);
    },
    [displayTime, isPlaying, playerDuration, seekToTime, src]
  );

  const seekTo = React.useCallback(
    (seconds: number, resumePlayback = isPlaying) => {
      if (!src || playerDuration <= 0) return;
      isScrubbingRef.current = false;
      wasPlayingBeforeScrub.current = false;
      void seekToTime(seconds, resumePlayback);
    },
    [isPlaying, playerDuration, seekToTime, src]
  );

  const startScrub = React.useCallback(() => {
    seekRequestIdRef.current += 1;
    pendingSeekRef.current = null;
    isScrubbingRef.current = true;
    wasPlayingBeforeScrub.current = status.playing;
    if (status.playing) lastPlaybackRequestAtRef.current = Date.now();
    setIsPlaybackRequested(status.playing);
  }, [status.playing]);

  const commitSeek = React.useCallback(
    async (seconds: number) => {
      await seekToTime(seconds, wasPlayingBeforeScrub.current);
    },
    [seekToTime]
  );

  const handleScrubMove = React.useCallback(
    (seconds: number) => {
      setDisplayTime(clamp(seconds, 0, playerDuration));
    },
    [playerDuration]
  );

  const handleScrubEnd = React.useCallback(
    (seconds: number) => {
      void commitSeek(clamp(seconds, 0, playerDuration));
    },
    [commitSeek, playerDuration]
  );

  return {
    currentPlaybackRate,
    displayTime,
    handlePlaybackRateChange,
    handleScrubEnd,
    handleScrubMove,
    handleScrubStart: startScrub,
    isDisabled: !src,
    isPlaying,
    pause: handlePause,
    pendingPlaybackTime,
    playerDuration,
    play: handlePlay,
    playFrom,
    progress,
    seekBy,
    seekTo,
    timeLabelTime,
    togglePlayback,
  };
};
