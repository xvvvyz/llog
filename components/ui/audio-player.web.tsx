import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useExclusiveMediaPlayback } from '@/hooks/use-exclusive-media-playback';
import { cn } from '@/utilities/cn';
import { useFileUriToSrc } from '@/utilities/file-uri-to-src';
import { formatTime } from '@/utilities/format-time';
import { Pause } from 'phosphor-react-native/lib/module/icons/Pause';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import * as React from 'react';
import { View } from 'react-native';

function useWebAudioPlayer(uri: string) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const src = useFileUriToSrc(uri);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onLoadedMetadata = () => {
      syncDuration();
      setLoaded(true);
    };

    const onCanPlay = () => {
      syncDuration();
      setLoaded(true);
    };

    const onDurationChange = () => syncDuration();
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    const onError = () => {
      setLoaded(false);
      setPlaying(false);
    };

    setLoaded(false);
    setPlaying(false);
    setDuration(0);

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    audio.load();

    if (audio.readyState >= 1) {
      syncDuration();
      setLoaded(true);
    }

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [src]);

  const play = React.useCallback(async (fromTime?: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (fromTime != null && Number.isFinite(fromTime)) {
      audio.currentTime = fromTime;
    }

    try {
      await audio.play();
    } catch {
      setPlaying(false);
    }
  }, []);

  const pause = React.useCallback((): number => {
    const audio = audioRef.current;
    if (!audio) return 0;
    const currentTime = audio.currentTime;
    audio.pause();
    setPlaying(false);
    return currentTime;
  }, []);

  const getCurrentTime = React.useCallback(() => {
    return audioRef.current?.currentTime ?? 0;
  }, []);

  return React.useMemo(
    () => ({
      audioRef,
      loaded,
      playing,
      duration,
      src,
      play,
      pause,
      getCurrentTime,
    }),
    [loaded, playing, duration, src, play, pause, getCurrentTime]
  );
}

export const AudioPlayer = ({
  compact,
  duration,
  uri,
}: {
  compact?: boolean;
  duration?: number;
  uri: string;
}) => {
  const player = useWebAudioPlayer(uri);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const scrubbing = React.useRef(false);
  const wasPlayingBeforeScrub = React.useRef(false);
  const rafRef = React.useRef<number>(0);
  const [displayTime, setDisplayTime] = React.useState(0);

  const pause = React.useCallback(() => {
    const time = player.pause();
    setDisplayTime(time);
  }, [player]);

  const { claimPlayback, releasePlayback } = useExclusiveMediaPlayback(pause);
  const playerDuration = duration ?? player.duration;
  const progress = playerDuration > 0 ? displayTime / playerDuration : 0;

  React.useEffect(() => {
    if (!player.playing) {
      releasePlayback();
    }
  }, [player.playing, releasePlayback]);

  React.useEffect(() => {
    if (!player.playing) {
      if (!scrubbing.current && playerDuration > 0) {
        const t = player.getCurrentTime();

        if (t >= playerDuration - 0.05) {
          setDisplayTime(playerDuration);
        }
      }
      return;
    }

    if (scrubbing.current) return;

    const tick = () => {
      if (playerDuration > 0) {
        const t = player.getCurrentTime();
        setDisplayTime(t);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [player, player.playing, playerDuration, player.getCurrentTime]);

  const play = React.useCallback(
    async (fromTime: number) => {
      if (!player.loaded) return;

      await claimPlayback();
      await player.play(fromTime);
    },
    [claimPlayback, player]
  );

  const handlePlay = () => {
    const fromTime = displayTime >= playerDuration ? 0 : displayTime;
    void play(fromTime);

    if (fromTime === 0) {
      setDisplayTime(0);
    }
  };

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const getX = (e: PointerEvent) => {
      const rect = track.getBoundingClientRect();
      return Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    };

    const seekTo = (x: number) => {
      const width = track.getBoundingClientRect().width;
      if (width <= 0 || playerDuration <= 0) return;
      setDisplayTime((x / width) * playerDuration);
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      scrubbing.current = true;
      wasPlayingBeforeScrub.current = player.playing;
      if (player.playing) player.pause();
      track.setPointerCapture(e.pointerId);
      seekTo(getX(e));
    };

    const onMove = (e: PointerEvent) => {
      if (!scrubbing.current) return;
      seekTo(getX(e));
    };

    const onUp = (e: PointerEvent) => {
      if (!scrubbing.current) return;
      seekTo(getX(e));
      scrubbing.current = false;

      if (wasPlayingBeforeScrub.current) {
        const width = track.getBoundingClientRect().width;
        const fraction = getX(e) / width;
        void play(fraction * playerDuration);
      }
    };

    track.addEventListener('pointerdown', onDown);
    track.addEventListener('pointermove', onMove);
    track.addEventListener('pointerup', onUp);

    return () => {
      track.removeEventListener('pointerdown', onDown);
      track.removeEventListener('pointermove', onMove);
      track.removeEventListener('pointerup', onUp);
    };
  }, [play, player, playerDuration]);

  return (
    <View className="flex-row items-center">
      <audio ref={player.audioRef} preload="metadata" src={player.src} />
      <Button
        className={cn('mr-3 rounded-full', compact ? 'size-6' : 'size-8')}
        disabled={!player.loaded}
        onPress={() => (player.playing ? pause() : handlePlay())}
        size="icon"
        variant="secondary"
      >
        <Icon icon={player.playing ? Pause : Play} size={compact ? 12 : 16} />
      </Button>
      <div
        ref={trackRef}
        style={{
          flex: 1,
          height: compact ? 24 : 32,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            width: '100%',
            height: 4,
            borderRadius: 9999,
            backgroundColor: 'hsl(var(--border))',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(progress * 100, 100)}%`,
              height: '100%',
              borderRadius: 9999,
              backgroundColor: 'hsl(var(--foreground))',
            }}
          />
        </div>
      </div>
      <Text className="min-w-[40px] text-right text-xs text-muted-foreground">
        {formatTime(player.playing ? displayTime : playerDuration)}
      </Text>
    </View>
  );
};

export const AudioPlaylist = ({
  clips,
  compact,
}: {
  clips: { id: string; uri: string; duration?: number }[];
  compact?: boolean;
}) => (
  <>
    {clips.map((clip) => (
      <AudioPlayer
        key={clip.id}
        compact={compact}
        duration={clip.duration}
        uri={clip.uri}
      />
    ))}
  </>
);
