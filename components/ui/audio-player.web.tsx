import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { useFileUriToSrc } from '@/utilities/file-uri-to-src';
import { formatTime } from '@/utilities/format-time';
import { Pause, Play } from 'phosphor-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

function sniffMimeType(bytes: Uint8Array): string {
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return 'audio/webm';
  }

  if (
    bytes[0] === 0x4f &&
    bytes[1] === 0x67 &&
    bytes[2] === 0x67 &&
    bytes[3] === 0x53
  ) {
    return 'audio/ogg';
  }

  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return 'audio/mp4';
  }

  return 'audio/mp4';
}

function useWebAudioPlayer(uri: string) {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const startOffset = useRef(0);
  const startedAt = useRef(0);
  const fallbackRef = useRef(false);

  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const src = useFileUriToSrc(uri);

  useEffect(() => {
    let cancelled = false;
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.arrayBuffer();
      })
      .then((data) => {
        if (cancelled) return;
        const bytes = new Uint8Array(data);
        const mime = sniffMimeType(bytes);
        const blob = new Blob([bytes], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;

        return ctx
          .decodeAudioData(data)
          .then((buffer) => {
            if (cancelled) return;
            bufferRef.current = buffer;
            setDuration(buffer.duration);
            setLoaded(true);
          })
          .catch(() => {
            if (cancelled) return;
            fallbackRef.current = true;
            const audio = new Audio();
            audioElRef.current = audio;
            audio.preload = 'auto';
            audio.addEventListener('ended', () => setPlaying(false));

            audio.addEventListener(
              'canplaythrough',
              () => {
                if (cancelled) return;

                if (Number.isFinite(audio.duration)) {
                  setDuration(audio.duration);
                }

                setLoaded(true);
              },
              { once: true }
            );

            audio.addEventListener('durationchange', () => {
              if (Number.isFinite(audio.duration)) setDuration(audio.duration);
            });

            audio.src = blobUrl;
          });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      sourceRef.current?.stop();
      sourceRef.current?.disconnect();
      sourceRef.current = null;
      ctx.close();
      ctxRef.current = null;
      bufferRef.current = null;

      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current.removeAttribute('src');
        audioElRef.current.load();
        audioElRef.current = null;
      }

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [src]);

  const stopSource = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.onended = null;
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }, []);

  const play = useCallback(
    (fromTime?: number) => {
      if (fallbackRef.current) {
        const audio = audioElRef.current;
        if (!audio) return;

        if (fromTime != null && Number.isFinite(fromTime)) {
          audio.currentTime = fromTime;
        }

        audio.play().catch(() => {});
        setPlaying(true);
        return;
      }

      const ctx = ctxRef.current;
      const buffer = bufferRef.current;
      if (!ctx || !buffer) return;

      stopSource();

      const offset = Math.max(
        0,
        Math.min(fromTime ?? startOffset.current, buffer.duration)
      );

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      source.onended = () => {
        const elapsed = ctx.currentTime - startedAt.current;

        if (elapsed >= buffer.duration - offset - 0.1) {
          setPlaying(false);
          startOffset.current = buffer.duration;
        }
      };

      source.start(0, offset);
      sourceRef.current = source;
      startedAt.current = ctx.currentTime;
      startOffset.current = offset;
      setPlaying(true);
      if (ctx.state === 'suspended') ctx.resume();
    },
    [stopSource]
  );

  const pause = useCallback((): number => {
    if (fallbackRef.current) {
      const audio = audioElRef.current;
      if (!audio) return 0;
      audio.pause();
      setPlaying(false);
      return audio.currentTime;
    }

    const ctx = ctxRef.current;
    if (!ctx || !sourceRef.current) return startOffset.current;
    startOffset.current += ctx.currentTime - startedAt.current;
    stopSource();
    startedAt.current = 0;
    setPlaying(false);
    return startOffset.current;
  }, [stopSource]);

  const getCurrentTime = useCallback(() => {
    if (fallbackRef.current) {
      return audioElRef.current?.currentTime ?? 0;
    }

    const ctx = ctxRef.current;
    if (!ctx || !sourceRef.current) return startOffset.current;
    return startOffset.current + (ctx.currentTime - startedAt.current);
  }, []);

  return useMemo(
    () => ({ loaded, playing, duration, play, pause, getCurrentTime }),
    [loaded, playing, duration, play, pause, getCurrentTime]
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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrubbing = useRef(false);
  const wasPlayingBeforeScrub = useRef(false);
  const rafRef = useRef<number>(0);
  const [displayTime, setDisplayTime] = useState(0);
  const playerDuration = duration ?? player.duration;
  const progress = playerDuration > 0 ? displayTime / playerDuration : 0;

  useEffect(() => {
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

  const play = () => {
    if (!player.loaded) return;
    player.play(displayTime >= playerDuration ? 0 : displayTime);

    if (displayTime >= playerDuration) {
      setDisplayTime(0);
    }
  };

  const pause = () => {
    const t = player.pause();
    setDisplayTime(t);
  };

  useEffect(() => {
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
        player.play(fraction * playerDuration);
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
  }, [playerDuration, player]);

  return (
    <View className="flex-row items-center">
      <Button
        className={cn('mr-3 rounded-full', compact ? 'size-6' : 'size-8')}
        disabled={!player.loaded}
        onPress={() => (player.playing ? pause() : play())}
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
