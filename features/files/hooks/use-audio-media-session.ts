import type * as audioMetadata from '@/features/files/lib/audio-metadata';
import * as React from 'react';
import { Platform } from 'react-native';

const DEFAULT_SEEK_OFFSET_SECONDS = 5;
const ARTWORK_PRELOAD_TIMEOUT_MS = 2500;
type MediaSessionPlaybackState = 'none' | 'paused' | 'playing';

type MediaSessionAction =
  | 'nexttrack'
  | 'pause'
  | 'play'
  | 'previoustrack'
  | 'seekbackward'
  | 'seekforward'
  | 'seekto';

type MediaSessionActionDetails = { seekOffset?: number; seekTime?: number };
type MediaSessionActionHandler = (details: MediaSessionActionDetails) => void;

type MediaSessionLike = {
  metadata: unknown | null;
  playbackState?: MediaSessionPlaybackState;
  setActionHandler?: (
    action: MediaSessionAction,
    handler: MediaSessionActionHandler | null
  ) => void;
  setPositionState?: (state?: {
    duration: number;
    playbackRate: number;
    position: number;
  }) => void;
};

type MediaMetadataConstructor = new (
  metadata: audioMetadata.AudioMediaSessionMetadata
) => unknown;

type MediaSessionGlobal = typeof globalThis & {
  Image?: new () => HTMLImageElement;
  MediaMetadata?: MediaMetadataConstructor;
  navigator?: { mediaSession?: MediaSessionLike };
};

type AudioMediaSessionOptions = {
  currentTime: number;
  disabled: boolean;
  duration: number;
  isPlaying: boolean;
  metadata: audioMetadata.AudioMediaSessionMetadata | null;
  onNextTrack?: () => void;
  onPause: () => void;
  onPlay: () => void | Promise<void>;
  onPreviousTrack?: () => void;
  onSeekBackward: (seconds: number) => void;
  onSeekForward: (seconds: number) => void;
  onSeekTo: (seconds: number) => void;
  playbackRate: number;
};

const MEDIA_SESSION_ACTIONS: MediaSessionAction[] = [
  'nexttrack',
  'pause',
  'play',
  'previoustrack',
  'seekbackward',
  'seekforward',
  'seekto',
];

let activeMediaSessionOwner: symbol | null = null;
const preloadedArtworkSrcs = new Set<string>();
const pendingArtworkPreloads = new Map<string, Promise<void>>();

const getMediaSessionGlobals = () => {
  if (Platform.OS !== 'web') return null;
  const scope = globalThis as MediaSessionGlobal;
  const mediaSession = scope.navigator?.mediaSession;
  if (!mediaSession || !scope.MediaMetadata) return null;
  return { MediaMetadata: scope.MediaMetadata, mediaSession };
};

const setActionHandler = (
  mediaSession: MediaSessionLike,
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null
) => {
  try {
    mediaSession.setActionHandler?.(action, handler);
  } catch {}
};

const clearActionHandlers = (mediaSession: MediaSessionLike) => {
  for (const action of MEDIA_SESSION_ACTIONS) {
    setActionHandler(mediaSession, action, null);
  }
};

const setPositionState = (
  mediaSession: MediaSessionLike,
  state?: { duration: number; playbackRate: number; position: number }
) => {
  try {
    mediaSession.setPositionState?.(state);
  } catch {}
};

const preloadArtworkSrc = (src: string) => {
  if (preloadedArtworkSrcs.has(src)) return Promise.resolve();
  const existing = pendingArtworkPreloads.get(src);
  if (existing) return existing;
  const scope = globalThis as MediaSessionGlobal;
  if (Platform.OS !== 'web' || !scope.Image) return Promise.resolve();

  const promise = new Promise<void>((resolve) => {
    const image = new scope.Image!();
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const finish = (loaded: boolean) => {
      if (settled) return;
      settled = true;
      if (timeout != null) clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      if (loaded) preloadedArtworkSrcs.add(src);
      resolve();
    };

    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    timeout = setTimeout(() => finish(false), ARTWORK_PRELOAD_TIMEOUT_MS);
    image.src = src;
    if (image.complete && image.naturalWidth > 0) finish(true);
  }).finally(() => {
    pendingArtworkPreloads.delete(src);
  });

  pendingArtworkPreloads.set(src, promise);
  return promise;
};

export const preloadAudioMediaSessionArtwork = async (
  metadata: audioMetadata.AudioMediaSessionMetadata | null
) => {
  const artwork = metadata?.artwork;
  if (!artwork?.length) return;
  await Promise.all(artwork.map((item) => preloadArtworkSrc(item.src)));
};

export const useAudioMediaSession = ({
  currentTime,
  disabled,
  duration,
  isPlaying,
  metadata,
  onNextTrack,
  onPause,
  onPlay,
  onPreviousTrack,
  onSeekBackward,
  onSeekForward,
  onSeekTo,
  playbackRate,
}: AudioMediaSessionOptions) => {
  const ownerRef = React.useRef<symbol | null>(null);

  const actionsRef = React.useRef({
    onNextTrack,
    onPause,
    onPlay,
    onPreviousTrack,
    onSeekBackward,
    onSeekForward,
    onSeekTo,
  });

  if (!ownerRef.current) ownerRef.current = Symbol('audio-media-session');

  actionsRef.current = {
    onNextTrack,
    onPause,
    onPlay,
    onPreviousTrack,
    onSeekBackward,
    onSeekForward,
    onSeekTo,
  };

  const clearOwnedMediaSession = React.useCallback(() => {
    const owner = ownerRef.current;
    if (!owner || activeMediaSessionOwner !== owner) return;
    const globals = getMediaSessionGlobals();

    if (globals) {
      clearActionHandlers(globals.mediaSession);
      globals.mediaSession.metadata = null;
      globals.mediaSession.playbackState = 'none';
      setPositionState(globals.mediaSession);
    }

    activeMediaSessionOwner = null;
  }, []);

  React.useEffect(() => {
    if (disabled || !metadata) {
      clearOwnedMediaSession();
      return;
    }

    const globals = getMediaSessionGlobals();
    if (!globals) return;
    const owner = ownerRef.current;
    if (!owner) return;
    if (isPlaying) activeMediaSessionOwner = owner;
    if (activeMediaSessionOwner !== owner) return;
    const { mediaSession } = globals;
    const hasTrackNavigation = !!onPreviousTrack || !!onNextTrack;
    mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    setActionHandler(mediaSession, 'play', () => {
      void actionsRef.current.onPlay();
    });

    setActionHandler(mediaSession, 'pause', () => {
      actionsRef.current.onPause();
    });

    setActionHandler(
      mediaSession,
      'seekbackward',
      hasTrackNavigation
        ? null
        : (details) => {
            actionsRef.current.onSeekBackward(
              details.seekOffset ?? DEFAULT_SEEK_OFFSET_SECONDS
            );
          }
    );

    setActionHandler(
      mediaSession,
      'seekforward',
      hasTrackNavigation
        ? null
        : (details) => {
            actionsRef.current.onSeekForward(
              details.seekOffset ?? DEFAULT_SEEK_OFFSET_SECONDS
            );
          }
    );

    setActionHandler(mediaSession, 'seekto', (details) => {
      if (typeof details.seekTime !== 'number') return;
      actionsRef.current.onSeekTo(details.seekTime);
    });

    setActionHandler(
      mediaSession,
      'previoustrack',
      onPreviousTrack
        ? () => {
            actionsRef.current.onPreviousTrack?.();
          }
        : null
    );

    setActionHandler(
      mediaSession,
      'nexttrack',
      onNextTrack
        ? () => {
            actionsRef.current.onNextTrack?.();
          }
        : null
    );

    let cancelled = false;

    const setMetadata = () => {
      if (cancelled || activeMediaSessionOwner !== owner) return;
      const nextGlobals = getMediaSessionGlobals();
      if (!nextGlobals) return;

      nextGlobals.mediaSession.metadata = new nextGlobals.MediaMetadata(
        metadata
      );

      nextGlobals.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    };

    if (!metadata.artwork?.length) {
      setMetadata();
      return;
    }

    void preloadAudioMediaSessionArtwork(metadata).then(setMetadata);

    return () => {
      cancelled = true;
    };
  }, [
    clearOwnedMediaSession,
    disabled,
    isPlaying,
    metadata,
    onNextTrack,
    onPreviousTrack,
  ]);

  const positionUpdateSecond = Number.isFinite(currentTime)
    ? Math.floor(currentTime)
    : 0;

  React.useEffect(() => {
    const owner = ownerRef.current;
    if (!owner || activeMediaSessionOwner !== owner) return;
    if (disabled || !metadata) return;
    const globals = getMediaSessionGlobals();
    if (!globals) return;
    const safeDuration = Number.isFinite(duration) ? Math.max(duration, 0) : 0;
    if (safeDuration <= 0) return;
    globals.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    setPositionState(globals.mediaSession, {
      duration: safeDuration,
      playbackRate:
        Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1,
      position: Math.max(0, Math.min(currentTime, safeDuration)),
    });
  }, [
    disabled,
    duration,
    isPlaying,
    metadata,
    playbackRate,
    positionUpdateSecond,
    currentTime,
  ]);

  React.useEffect(() => clearOwnedMediaSession, [clearOwnedMediaSession]);
};
