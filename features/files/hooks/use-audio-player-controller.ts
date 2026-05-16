import { useExclusiveFilePlayback } from '@/features/files/hooks/use-exclusive-media-playback';
import * as webAudioPlayerSnapshot from '@/features/files/hooks/use-web-audio-player-snapshot';
import * as fileUriSources from '@/features/files/lib/file-uri-to-src';
import * as audioPlaybackRate from '@/features/files/lib/media-playback-rate';
import { isLocalFileSourceUri } from '@/features/files/lib/offline-availability';
import type { AudioPlayerProps } from '@/features/files/types/audio-player';
import { useShowOfflineUi } from '@/features/offline/offline-ui-state';
import { clamp } from '@/lib/clamp';
import { positiveDurationSeconds } from '@/lib/duration';
import * as React from 'react';
import { Platform } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

const SEEK_SYNC_TOLERANCE_SECONDS = 0.15;
const EXACT_SEEK_TOLERANCE_MS = 0;
const PLAYBACK_REQUEST_PAUSE_GRACE_MS = 1500;
const PLAYBACK_START_RETRY_DELAYS_MS = [120, 400, 900] as const;
type PendingSeek = { id: number; resumePlayback: boolean; seconds: number };
type SeekOptions = { skipIfAlreadyThere?: boolean };

const isWaitingForPlayback = (status: {
  isBuffering: boolean;
  timeControlStatus: string;
}) => status.isBuffering || status.timeControlStatus === 'waiting';

export const useAudioPlayerController = ({
  active = true,
  autoPlayKey,
  disabled = false,
  durationSeconds,
  onDidFinish,
  onPause,
  onPlayStart,
  onPlaybackRateChange,
  playbackRate,
  assetKey,
  uri,
}: AudioPlayerProps) => {
  const showOfflineUi = useShowOfflineUi();
  const sourceUri = fileUriSources.getFileSourceUri({ assetKey, uri });

  const sourceUnavailableOffline =
    showOfflineUi && !isLocalFileSourceUri(sourceUri);

  const src = fileUriSources.useFileUriToSrc(
    sourceUnavailableOffline ? null : sourceUri
  );

  const player = useAudioPlayer(src, { updateInterval: 50 });
  const status = useAudioPlayerStatus(player);
  const wasPlayingBeforeScrub = React.useRef(false);
  const isScrubbingRef = React.useRef(false);
  const pendingSeekRef = React.useRef<PendingSeek | null>(null);
  const seekRequestIdRef = React.useRef(0);
  const lastAutoPlayKeyRef = React.useRef<number | undefined>(undefined);
  const lastPlaybackRequestAtRef = React.useRef(0);
  const playbackRequestIdRef = React.useRef(0);
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

  const metadataDuration = webAudioPlayerSnapshot.useWebAudioMetadataDuration(
    player,
    src
  );

  const currentPlaybackRate = playbackRate ?? localPlaybackRate;

  const webPlaybackSnapshot =
    webAudioPlayerSnapshot.useWebAudioPlaybackSnapshot(
      player,
      src,
      isPlaybackRequested
    );

  const playerDuration =
    positiveDurationSeconds(durationSeconds) ??
    metadataDuration ??
    positiveDurationSeconds(status.duration) ??
    positiveDurationSeconds(player.duration) ??
    0;

  const playbackTime = Math.min(status.currentTime, playerDuration);
  const playbackWaiting = isWaitingForPlayback(status);

  const effectivePlaybackTime = webPlaybackSnapshot
    ? Math.min(webPlaybackSnapshot.currentTime, playerDuration)
    : playbackTime;

  const effectiveIsPlaying = status.playing || !!webPlaybackSnapshot?.playing;

  const effectiveDidFinish =
    status.didJustFinish || !!webPlaybackSnapshot?.ended;

  const webDidFinish = !!webPlaybackSnapshot?.ended;

  const isPreviewingScrubTime =
    !effectiveIsPlaying && Math.abs(displayTime - effectivePlaybackTime) > 0.05;

  const hasPausedProgress = !effectiveIsPlaying && displayTime > 0.05;

  const timeLabelTime =
    effectiveIsPlaying ||
    hasPausedProgress ||
    isPreviewingScrubTime ||
    isScrubbingRef.current ||
    pendingSeekRef.current
      ? displayTime
      : playerDuration;

  const isPlaying =
    isPlaybackRequested ||
    effectiveIsPlaying ||
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
    playbackRequestIdRef.current += 1;
    lastPlaybackRequestAtRef.current = Date.now();
    setIsPlaybackRequested(true);
  }, []);

  const clearPlaybackRequest = React.useCallback(() => {
    playbackRequestIdRef.current += 1;
    setIsPlaybackRequested(false);
    setPendingPlaybackTime(null);
    wasPlayingBeforeScrub.current = false;
  }, []);

  const cancelPendingSeek = React.useCallback(() => {
    seekRequestIdRef.current += 1;
    pendingSeekRef.current = null;
  }, []);

  const clearScrubState = React.useCallback(() => {
    isScrubbingRef.current = false;
    wasPlayingBeforeScrub.current = false;
  }, []);

  const resetPlaybackState = React.useCallback(() => {
    cancelPendingSeek();
    clearScrubState();
    finishNotifiedRef.current = false;
    hasObservedPlaybackRef.current = false;
    lastAutoPlayKeyRef.current = undefined;
    lastPlaybackRequestAtRef.current = 0;
    clearPlaybackRequest();
    setDisplayTime(0);
  }, [cancelPendingSeek, clearPlaybackRequest, clearScrubState]);

  const isUnderlyingPlaybackActive = React.useCallback(() => {
    const media = webAudioPlayerSnapshot.getWebMediaElement(player);
    if (media) return !media.paused && !media.ended;
    return player.playing;
  }, [player]);

  const pausePlayback = React.useCallback(() => {
    clearPlaybackRequest();
    player.pause();
  }, [clearPlaybackRequest, player]);

  const { claimPlayback, releasePlayback } =
    useExclusiveFilePlayback(pausePlayback);

  const startPlayback = React.useCallback(() => {
    void claimPlayback();
    requestPlayback();
    player.play();
    onPlayStart?.();
  }, [claimPlayback, onPlayStart, player, requestPlayback]);

  const settlePendingSeek = React.useCallback(
    (seekId: number) => {
      const pendingSeek = pendingSeekRef.current;
      if (!pendingSeek || pendingSeek.id !== seekId) return;
      setDisplayTime(pendingSeek.seconds);
      pendingSeekRef.current = null;
      isScrubbingRef.current = false;
      setPendingPlaybackTime(null);
      if (!pendingSeek.resumePlayback) return;
      startPlayback();
    },
    [startPlayback]
  );

  const getObservedPlaybackTime = React.useCallback(() => {
    if (Platform.OS === 'web' && Number.isFinite(player.currentTime)) {
      return player.currentTime;
    }

    return playbackTime;
  }, [playbackTime, player]);

  const isAtPlaybackTime = React.useCallback(
    (seconds: number) => {
      return (
        Math.abs(getObservedPlaybackTime() - seconds) <=
        SEEK_SYNC_TOLERANCE_SECONDS
      );
    },
    [getObservedPlaybackTime]
  );

  const canSettleAfterSeek = React.useCallback(
    (seconds: number) => Platform.OS !== 'web' || isAtPlaybackTime(seconds),
    [isAtPlaybackTime]
  );

  React.useEffect(() => {
    if (isScrubbingRef.current) return;
    if (pendingSeekRef.current) return;
    if (pendingPlaybackTime != null) return;

    if (playerDuration <= 0) {
      setDisplayTime(0);
      return;
    }

    if (effectiveDidFinish && !isPlaybackRequested && !effectiveIsPlaying) {
      setDisplayTime(playerDuration);
      return;
    }

    setDisplayTime(effectivePlaybackTime);
  }, [
    effectiveIsPlaying,
    effectivePlaybackTime,
    isPlaybackRequested,
    pendingPlaybackTime,
    playerDuration,
    effectiveDidFinish,
  ]);

  React.useEffect(() => {
    const pendingSeek = pendingSeekRef.current;
    if (!pendingSeek) return;

    if (
      Math.abs(effectivePlaybackTime - pendingSeek.seconds) >
      SEEK_SYNC_TOLERANCE_SECONDS
    ) {
      return;
    }

    void settlePendingSeek(pendingSeek.id);
  }, [effectivePlaybackTime, settlePendingSeek]);

  React.useEffect(() => {
    if (!effectiveIsPlaying) return;
    hasObservedPlaybackRef.current = true;
    if (pendingPlaybackTime != null) return;
    if (pendingSeekRef.current) return;
    isScrubbingRef.current = false;
    wasPlayingBeforeScrub.current = false;
  }, [effectiveIsPlaying, pendingPlaybackTime]);

  React.useEffect(() => {
    const shouldClearInterruptedPlaybackRequest = () => {
      if (effectiveIsPlaying || !isPlaybackRequested) return false;
      if (!hasObservedPlaybackRef.current) return false;
      if (pendingPlaybackTime != null) return false;
      if (pendingSeekRef.current) return false;
      if (isScrubbingRef.current) return false;
      if (effectiveDidFinish) return false;
      if (playbackWaiting) return false;
      return true;
    };

    if (!shouldClearInterruptedPlaybackRequest()) return;

    const remainingGraceTime =
      PLAYBACK_REQUEST_PAUSE_GRACE_MS -
      (Date.now() - lastPlaybackRequestAtRef.current);

    const clearInterruptedPlaybackRequest = () => {
      if (!shouldClearInterruptedPlaybackRequest()) return;
      clearPlaybackRequest();
    };

    if (remainingGraceTime <= 0) {
      clearInterruptedPlaybackRequest();
      return;
    }

    const timeout = setTimeout(
      clearInterruptedPlaybackRequest,
      remainingGraceTime
    );

    return () => clearTimeout(timeout);
  }, [
    clearPlaybackRequest,
    effectiveIsPlaying,
    isPlaybackRequested,
    pendingPlaybackTime,
    playbackWaiting,
    effectiveDidFinish,
  ]);

  React.useEffect(() => {
    if (!isPlaybackRequested) return;
    if (effectiveIsPlaying || isUnderlyingPlaybackActive()) return;
    if (pendingPlaybackTime != null) return;
    if (pendingSeekRef.current) return;
    if (isScrubbingRef.current) return;
    if (effectiveDidFinish) return;
    if (playbackWaiting) return;
    const playbackRequestId = playbackRequestIdRef.current;

    const timeouts = [
      ...PLAYBACK_START_RETRY_DELAYS_MS.map((delay) =>
        setTimeout(() => {
          if (playbackRequestIdRef.current !== playbackRequestId) return;
          if (isUnderlyingPlaybackActive()) return;
          player.play();
        }, delay)
      ),
      setTimeout(() => {
        if (playbackRequestIdRef.current !== playbackRequestId) return;
        if (isUnderlyingPlaybackActive()) return;
        clearPlaybackRequest();
      }, PLAYBACK_REQUEST_PAUSE_GRACE_MS),
    ];

    return () => {
      for (const timeout of timeouts) clearTimeout(timeout);
    };
  }, [
    clearPlaybackRequest,
    effectiveDidFinish,
    effectiveIsPlaying,
    isPlaybackRequested,
    isUnderlyingPlaybackActive,
    pendingPlaybackTime,
    player,
    playbackWaiting,
  ]);

  React.useEffect(() => {
    if (effectiveIsPlaying || isPlaying) return;
    releasePlayback();
  }, [effectiveIsPlaying, isPlaying, releasePlayback]);

  React.useEffect(() => {
    if (!src) return;
    player.setPlaybackRate(currentPlaybackRate, 'high');
  }, [currentPlaybackRate, player, src]);

  React.useEffect(() => {
    if (active || !effectiveIsPlaying) return;
    setDisplayTime(effectivePlaybackTime);
    clearPlaybackRequest();
    player.pause();
  }, [
    active,
    clearPlaybackRequest,
    effectiveIsPlaying,
    effectivePlaybackTime,
    player,
  ]);

  React.useEffect(() => {
    resetPlaybackState();
  }, [resetPlaybackState, src]);

  React.useEffect(() => {
    const isAtFinishedPosition =
      webDidFinish ||
      effectivePlaybackTime >= Math.max(playerDuration - 0.05, 0);

    if (!effectiveDidFinish || effectiveIsPlaying || !isAtFinishedPosition) {
      if (effectiveIsPlaying || !isAtFinishedPosition) {
        finishNotifiedRef.current = false;
      }

      return;
    }

    if (
      (!hasObservedPlaybackRef.current && !isPlaybackRequested) ||
      finishNotifiedRef.current
    ) {
      return;
    }

    finishNotifiedRef.current = true;
    hasObservedPlaybackRef.current = false;
    clearPlaybackRequest();
    if (active) onDidFinish?.();
  }, [
    active,
    clearPlaybackRequest,
    effectiveDidFinish,
    effectiveIsPlaying,
    effectivePlaybackTime,
    isPlaybackRequested,
    onDidFinish,
    playerDuration,
    webDidFinish,
  ]);

  const seekToResolvedTime = React.useCallback(
    async (
      seconds: number,
      resumePlayback: boolean,
      options: SeekOptions = {}
    ) => {
      if (!src || sourceUnavailableOffline) return;
      const seekSeconds = clamp(seconds, 0, playerDuration);
      const seekId = seekRequestIdRef.current + 1;
      seekRequestIdRef.current = seekId;

      pendingSeekRef.current = {
        id: seekId,
        resumePlayback,
        seconds: seekSeconds,
      };

      clearScrubState();

      if (resumePlayback) requestPlayback();
      else clearPlaybackRequest();

      setDisplayTime(seekSeconds);
      setPendingPlaybackTime(resumePlayback ? seekSeconds : null);

      if (options.skipIfAlreadyThere && isAtPlaybackTime(seekSeconds)) {
        settlePendingSeek(seekId);
        return;
      }

      const seekPromise = player.seekTo(
        seekSeconds,
        EXACT_SEEK_TOLERANCE_MS,
        EXACT_SEEK_TOLERANCE_MS
      );

      if (
        Platform.OS === 'web' &&
        pendingSeekRef.current?.id === seekId &&
        canSettleAfterSeek(seekSeconds)
      ) {
        settlePendingSeek(seekId);
      }

      await seekPromise;
      if (pendingSeekRef.current?.id !== seekId) return;
      if (canSettleAfterSeek(seekSeconds)) settlePendingSeek(seekId);
    },
    [
      canSettleAfterSeek,
      clearPlaybackRequest,
      clearScrubState,
      isAtPlaybackTime,
      player,
      playerDuration,
      requestPlayback,
      settlePendingSeek,
      sourceUnavailableOffline,
      src,
    ]
  );

  const playFrom = React.useCallback(
    async (seconds: number) => {
      await seekToResolvedTime(seconds, true, { skipIfAlreadyThere: true });
    },
    [seekToResolvedTime]
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
    if (!src || sourceUnavailableOffline) return;

    const startTime =
      effectiveDidFinish || displayTime >= playerDuration ? 0 : displayTime;

    if (!effectiveDidFinish && isAtPlaybackTime(startTime)) {
      cancelPendingSeek();
      clearScrubState();
      setDisplayTime(startTime);
      setPendingPlaybackTime(null);
      startPlayback();
      return;
    }

    await playFrom(startTime);
  }, [
    displayTime,
    effectiveDidFinish,
    cancelPendingSeek,
    clearScrubState,
    isAtPlaybackTime,
    playerDuration,
    playFrom,
    sourceUnavailableOffline,
    src,
    startPlayback,
  ]);

  const handlePause = React.useCallback(() => {
    cancelPendingSeek();
    clearScrubState();
    clearPlaybackRequest();
    player.pause();
    onPause?.();
  }, [
    cancelPendingSeek,
    clearPlaybackRequest,
    clearScrubState,
    onPause,
    player,
  ]);

  React.useEffect(() => {
    if (!disabled || !status.playing) return;
    handlePause();
  }, [disabled, handlePause, status.playing]);

  const togglePlayback = React.useCallback(() => {
    if (isPlaying) handlePause();
    else void handlePlay();
  }, [handlePause, handlePlay, isPlaying]);

  const seekBy = React.useCallback(
    (secondsDelta: number) => {
      if (!src || sourceUnavailableOffline || playerDuration <= 0) return;
      const baseTime = pendingSeekRef.current?.seconds ?? displayTime;
      const resumePlayback = isPlaying;
      clearScrubState();
      void seekToResolvedTime(baseTime + secondsDelta, resumePlayback);
    },
    [
      clearScrubState,
      displayTime,
      isPlaying,
      playerDuration,
      seekToResolvedTime,
      sourceUnavailableOffline,
      src,
    ]
  );

  const seekTo = React.useCallback(
    (seconds: number, resumePlayback = isPlaying) => {
      if (!src || sourceUnavailableOffline || playerDuration <= 0) return;
      clearScrubState();
      void seekToResolvedTime(seconds, resumePlayback);
    },
    [
      clearScrubState,
      isPlaying,
      playerDuration,
      seekToResolvedTime,
      sourceUnavailableOffline,
      src,
    ]
  );

  const startScrub = React.useCallback(() => {
    cancelPendingSeek();
    isScrubbingRef.current = true;
    wasPlayingBeforeScrub.current = effectiveIsPlaying;
    if (effectiveIsPlaying) lastPlaybackRequestAtRef.current = Date.now();
    setIsPlaybackRequested(effectiveIsPlaying);
  }, [cancelPendingSeek, effectiveIsPlaying]);

  const commitSeek = React.useCallback(
    async (seconds: number) => {
      await seekToResolvedTime(seconds, wasPlayingBeforeScrub.current);
    },
    [seekToResolvedTime]
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
    isDisabled: disabled || !src || sourceUnavailableOffline,
    isUnavailableOffline: sourceUnavailableOffline,
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
