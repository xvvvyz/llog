import { useExclusiveMediaPlayback } from '@/features/media/hooks/use-exclusive-media-playback';
import { useWebAudioPlayer } from '@/features/media/hooks/use-web-audio-player';
import * as audioPlaybackRateUtils from '@/features/media/lib/audio-playback-rate';
import type { AudioPlayerProps } from '@/features/media/types/audio-player.types';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import * as React from 'react';

type ButtonPointerDownEvent = Parameters<
  NonNullable<React.ComponentPropsWithoutRef<typeof Button>['onPointerDown']>
>[0];

export const useWebAudioPlayerController = ({
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
  const player = useWebAudioPlayer(uri);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const fillRef = React.useRef<HTMLDivElement | null>(null);
  const timeTextRef = React.useRef<HTMLSpanElement | null>(null);
  const playPointerDownHandledRef = React.useRef(false);
  const scrubbing = React.useRef(false);
  const wasPlayingBeforeScrub = React.useRef(false);
  const rafRef = React.useRef<number>(0);
  const lastAutoPlayKeyRef = React.useRef<number | undefined>(undefined);
  const lastEndedTokenRef = React.useRef(0);
  const displayTimeRef = React.useRef(0);
  const displayedSecondRef = React.useRef<number | null>(null);
  const playbackAnchorTimeRef = React.useRef(0);
  const playbackAnchorNowRef = React.useRef(0);

  const playbackRateRef =
    React.useRef<audioPlaybackRateUtils.AudioPlaybackRate>(
      audioPlaybackRateUtils.DEFAULT_AUDIO_PLAYBACK_RATE
    );

  const previousSrcRef = React.useRef<string | null | undefined>(undefined);

  const [localPlaybackRate, setLocalPlaybackRate] =
    React.useState<audioPlaybackRateUtils.AudioPlaybackRate>(
      audioPlaybackRateUtils.DEFAULT_AUDIO_PLAYBACK_RATE
    );

  const currentPlaybackRate = playbackRate ?? localPlaybackRate;
  const playerDuration = Math.max(player.duration || duration || 0, 0);

  const handlePlaybackRateChange = React.useCallback(
    (nextPlaybackRate: audioPlaybackRateUtils.AudioPlaybackRate) => {
      onPlaybackRateChange?.(nextPlaybackRate);
      if (!onPlaybackRateChange) setLocalPlaybackRate(nextPlaybackRate);
    },
    [onPlaybackRateChange]
  );

  const setFillElement = React.useCallback(
    (element: HTMLDivElement | null) => {
      fillRef.current = element;
      if (!element) return;
      const time = displayTimeRef.current;

      const progress =
        playerDuration > 0
          ? Math.max(0, Math.min(time / playerDuration, 1))
          : 0;

      element.style.transform = `scaleX(${progress})`;
    },
    [playerDuration]
  );

  const clampDisplayTime = React.useCallback(
    (time: number) => {
      if (!Number.isFinite(time)) return 0;
      if (playerDuration <= 0) return Math.max(0, time);
      return Math.max(0, Math.min(time, playerDuration));
    },
    [playerDuration]
  );

  const syncPlaybackClock = React.useCallback(
    (time: number) => {
      const nextTime = clampDisplayTime(time);
      playbackAnchorTimeRef.current = nextTime;
      playbackAnchorNowRef.current = performance.now();
    },
    [clampDisplayTime]
  );

  const getProjectedPlaybackTime = React.useCallback(() => {
    const elapsedSeconds = Math.max(
      0,
      (performance.now() - playbackAnchorNowRef.current) / 1000
    );

    return clampDisplayTime(
      playbackAnchorTimeRef.current + elapsedSeconds * playbackRateRef.current
    );
  }, [clampDisplayTime]);

  const paintProgress = React.useCallback(
    (time: number) => {
      const fill = fillRef.current;
      if (!fill) return;

      const progress =
        playerDuration > 0
          ? Math.max(0, Math.min(time / playerDuration, 1))
          : 0;

      fill.style.transform = `scaleX(${progress})`;
    },
    [playerDuration]
  );

  const paintTimeText = React.useCallback(
    (time: number) => {
      const label = timeTextRef.current;
      if (!label) return;
      const nextText = formatTime(player.playing ? time : playerDuration);
      if (label.textContent !== nextText) label.textContent = nextText;
    },
    [player.playing, playerDuration]
  );

  const updateDisplayTime = React.useCallback(
    (time: number, options: { forcePaint?: boolean } = {}) => {
      const nextTime = clampDisplayTime(time);
      displayTimeRef.current = nextTime;
      paintProgress(nextTime);

      const nextSecond =
        playerDuration > 0 && nextTime >= playerDuration - 0.05
          ? Math.floor(playerDuration)
          : Math.floor(nextTime);

      if (
        options.forcePaint ||
        displayedSecondRef.current == null ||
        displayedSecondRef.current !== nextSecond
      ) {
        displayedSecondRef.current = nextSecond;
        paintTimeText(nextTime);
      }
    },
    [clampDisplayTime, paintProgress, paintTimeText, playerDuration]
  );

  const pause = React.useCallback(() => {
    const time = player.playing
      ? getProjectedPlaybackTime()
      : player.getCurrentTime();

    player.pause();
    syncPlaybackClock(time);
    updateDisplayTime(time, { forcePaint: true });
  }, [getProjectedPlaybackTime, player, syncPlaybackClock, updateDisplayTime]);

  const { claimPlayback, releasePlayback } = useExclusiveMediaPlayback(pause);

  React.useEffect(() => {
    if (!player.playing) releasePlayback();
  }, [player.playing, releasePlayback]);

  React.useEffect(() => {
    if (player.playing) syncPlaybackClock(getProjectedPlaybackTime());
    player.setPlaybackRate(currentPlaybackRate);
    playbackRateRef.current = currentPlaybackRate;
  }, [
    currentPlaybackRate,
    getProjectedPlaybackTime,
    player,
    syncPlaybackClock,
  ]);

  React.useEffect(() => {
    if (active || !player.playing) return;
    pause();
  }, [active, pause, player.playing]);

  React.useEffect(() => {
    if (previousSrcRef.current === player.src) return;
    previousSrcRef.current = player.src;
    lastAutoPlayKeyRef.current = undefined;
    displayedSecondRef.current = null;
    displayTimeRef.current = 0;
    syncPlaybackClock(0);
    paintTimeText(0);
    if (fillRef.current) fillRef.current.style.transform = 'scaleX(0)';
  }, [paintTimeText, player.src, syncPlaybackClock]);

  React.useEffect(() => {
    updateDisplayTime(displayTimeRef.current, { forcePaint: true });
  }, [playerDuration, updateDisplayTime]);

  React.useEffect(() => {
    paintTimeText(displayTimeRef.current);
  }, [paintTimeText]);

  React.useEffect(() => {
    if (player.endedToken === lastEndedTokenRef.current) return;
    lastEndedTokenRef.current = player.endedToken;
    updateDisplayTime(playerDuration, { forcePaint: true });
    if (active) onDidFinish?.();
  }, [
    active,
    onDidFinish,
    player.endedToken,
    playerDuration,
    updateDisplayTime,
  ]);

  React.useEffect(() => {
    if (!player.playing) {
      if (!scrubbing.current && playerDuration > 0) {
        const t = player.getCurrentTime();

        if (t >= playerDuration - 0.05) {
          updateDisplayTime(playerDuration, { forcePaint: true });
        }
      }

      return;
    }

    if (scrubbing.current) return;

    const tick = () => {
      if (playerDuration > 0) updateDisplayTime(getProjectedPlaybackTime());
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [
    player,
    player.playing,
    playerDuration,
    getProjectedPlaybackTime,
    updateDisplayTime,
  ]);

  const play = React.useCallback(
    async (fromTime: number) => {
      if (!player.loaded) return;
      const startTime = clampDisplayTime(fromTime);
      syncPlaybackClock(startTime);
      updateDisplayTime(startTime, { forcePaint: true });
      const didStart = await player.play(startTime);
      if (!didStart) return;
      syncPlaybackClock(startTime);
      await claimPlayback();
      onPlayStart?.();
    },
    [
      claimPlayback,
      clampDisplayTime,
      onPlayStart,
      player,
      syncPlaybackClock,
      updateDisplayTime,
    ]
  );

  React.useEffect(() => {
    if (
      !active ||
      !player.loaded ||
      !player.src ||
      autoPlayKey == null ||
      lastAutoPlayKeyRef.current === autoPlayKey
    ) {
      return;
    }

    lastAutoPlayKeyRef.current = autoPlayKey;
    updateDisplayTime(0, { forcePaint: true });
    void play(0);
  }, [active, autoPlayKey, play, player.loaded, player.src, updateDisplayTime]);

  const handlePlay = React.useCallback(() => {
    if (!player.src) return;
    const currentTime = displayTimeRef.current;
    const fromTime = currentTime >= playerDuration ? 0 : currentTime;
    void play(fromTime);
    if (fromTime === 0) updateDisplayTime(0, { forcePaint: true });
  }, [play, player.src, playerDuration, updateDisplayTime]);

  const handlePause = React.useCallback(() => {
    pause();
    onPause?.();
  }, [onPause, pause]);

  const playButtonDisabled = !player.loaded || !player.src;

  const togglePlayback = React.useCallback(() => {
    if (playButtonDisabled) return;
    player.playing ? handlePause() : handlePlay();
  }, [handlePause, handlePlay, playButtonDisabled, player.playing]);

  const handlePlayButtonPointerDown = React.useCallback(
    (event: ButtonPointerDownEvent) => {
      if (playButtonDisabled) return;
      event.preventDefault();
      playPointerDownHandledRef.current = true;
      togglePlayback();

      window.setTimeout(() => {
        playPointerDownHandledRef.current = false;
      }, 350);
    },
    [playButtonDisabled, togglePlayback]
  );

  const handlePlayButtonPress = React.useCallback(() => {
    if (playPointerDownHandledRef.current) return;
    togglePlayback();
  }, [togglePlayback]);

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const getX = (e: PointerEvent) => {
      const rect = track.getBoundingClientRect();
      return Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    };

    const getTime = (x: number) => {
      const width = track.getBoundingClientRect().width;
      if (width <= 0 || playerDuration <= 0) return null;
      return (x / width) * playerDuration;
    };

    const seekTo = (x: number, forcePaint = false) => {
      const time = getTime(x);
      if (time == null) return;
      updateDisplayTime(time, { forcePaint });
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      scrubbing.current = true;
      wasPlayingBeforeScrub.current = player.playing;
      if (player.playing) player.pause();
      track.setPointerCapture(e.pointerId);
      seekTo(getX(e), true);
    };

    const onMove = (e: PointerEvent) => {
      if (!scrubbing.current) return;
      seekTo(getX(e));
    };

    const onUp = (e: PointerEvent) => {
      if (!scrubbing.current) return;
      const time = getTime(getX(e));
      if (time != null) updateDisplayTime(time, { forcePaint: true });
      scrubbing.current = false;
      if (wasPlayingBeforeScrub.current && time != null) void play(time);
    };

    track.addEventListener('pointerdown', onDown);
    track.addEventListener('pointermove', onMove);
    track.addEventListener('pointerup', onUp);

    return () => {
      track.removeEventListener('pointerdown', onDown);
      track.removeEventListener('pointermove', onMove);
      track.removeEventListener('pointerup', onUp);
    };
  }, [play, player, playerDuration, updateDisplayTime]);

  return {
    audioRef: player.audioRef,
    audioSrc: player.src,
    currentPlaybackRate,
    displayTime: displayTimeRef.current,
    handlePlaybackRateChange,
    handlePlayButtonPointerDown,
    handlePlayButtonPress,
    isPlaybackRateDisabled: !player.src,
    isPlayButtonDisabled: playButtonDisabled,
    isPlaying: player.playing,
    playerDuration,
    setFillElement,
    timeTextRef,
    trackRef,
  };
};
