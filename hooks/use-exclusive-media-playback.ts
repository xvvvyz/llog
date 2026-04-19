import * as React from 'react';

type PausePlayback = () => void | Promise<void>;

let activePlayback: { id: symbol; pause: PausePlayback } | null = null;

const requestExclusivePlayback = async (id: symbol, pause: PausePlayback) => {
  if (activePlayback?.id === id) {
    activePlayback = { id, pause };
    return;
  }

  const previous = activePlayback;
  activePlayback = { id, pause };

  if (!previous || previous.id === id) return;

  try {
    await previous.pause();
  } catch {}

  if (activePlayback?.id === id) {
    activePlayback = { id, pause };
  }
};

const releaseExclusivePlayback = (id: symbol) => {
  if (activePlayback?.id === id) {
    activePlayback = null;
  }
};

export const useExclusiveMediaPlayback = (pause: PausePlayback) => {
  const idRef = React.useRef<symbol | null>(null);
  const pauseRef = React.useRef(pause);

  if (!idRef.current) {
    idRef.current = Symbol('media-playback');
  }

  pauseRef.current = pause;

  const claimPlayback = React.useCallback(() => {
    return requestExclusivePlayback(idRef.current!, () => pauseRef.current());
  }, []);

  const releasePlayback = React.useCallback(() => {
    releaseExclusivePlayback(idRef.current!);
  }, []);

  React.useEffect(() => releasePlayback, [releasePlayback]);

  return { claimPlayback, releasePlayback };
};
