import { useFileUriToSrc } from '@/features/media/lib/file-uri-to-src';
import * as React from 'react';

export const useWebAudioPlayer = (uri: string) => {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [endedToken, setEndedToken] = React.useState(0);
  const src = useFileUriToSrc(uri);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!src) {
      setLoaded(false);
      setPlaying(false);
      setDuration(0);
      audio.removeAttribute('src');
      audio.load();
      return;
    }

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

    const onEnded = () => {
      setPlaying(false);
      setEndedToken((token) => token + 1);
    };

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
    if (!audio) return false;

    if (fromTime != null && Number.isFinite(fromTime)) {
      audio.currentTime = fromTime;
    }

    try {
      await audio.play();
      setPlaying(true);
      return true;
    } catch {
      setPlaying(false);
      return false;
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

  const setPlaybackRate = React.useCallback((playbackRate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, []);

  return React.useMemo(
    () => ({
      audioRef,
      duration,
      endedToken,
      getCurrentTime,
      loaded,
      pause,
      play,
      playing,
      setPlaybackRate,
      src,
    }),
    [
      duration,
      endedToken,
      getCurrentTime,
      loaded,
      pause,
      play,
      playing,
      setPlaybackRate,
      src,
    ]
  );
};
