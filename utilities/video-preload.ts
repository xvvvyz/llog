export const VIDEO_PRELOAD_CACHE_LIMIT = 6;
export const VIDEO_START_THRESHOLD_SECONDS = 0.05;
const VIDEO_WARM_SET_LIMIT = 32;

const warmedVideoSources = new Set<string>();

export const markVideoWarm = (source?: string | null) => {
  if (!source) return;
  if (warmedVideoSources.has(source)) warmedVideoSources.delete(source);
  warmedVideoSources.add(source);

  if (warmedVideoSources.size > VIDEO_WARM_SET_LIMIT) {
    const oldest = warmedVideoSources.values().next().value;
    if (oldest) warmedVideoSources.delete(oldest);
  }
};

export const isVideoWarm = (source?: string | null) =>
  source ? warmedVideoSources.has(source) : false;

export const forgetWarmVideo = (source?: string | null) => {
  if (!source) return;
  warmedVideoSources.delete(source);
};

export const isNearVideoStart = (currentTime: number) =>
  !Number.isFinite(currentTime) || currentTime <= VIDEO_START_THRESHOLD_SECONDS;

export type PreloadCache<T> = {
  get: (key: string) => T | undefined;
  has: (key: string) => boolean;
  set: (key: string, value: T) => void;
  touch: (key: string) => void;
  release: (key: string) => void;
};

export const createPreloadCache = <T>({
  limit,
  dispose,
}: {
  limit: number;
  dispose: (value: T) => void;
}): PreloadCache<T> => {
  const entries = new Map<string, T>();
  const order: string[] = [];

  const remove = (key: string) => {
    const idx = order.indexOf(key);
    if (idx !== -1) order.splice(idx, 1);
  };

  const touch = (key: string) => {
    remove(key);
    order.push(key);
  };

  const release = (key: string) => {
    const value = entries.get(key);
    if (!value) return;
    entries.delete(key);
    forgetWarmVideo(key);
    remove(key);

    try {
      dispose(value);
    } catch {}
  };

  const trim = () => {
    while (order.length > limit) {
      const oldest = order.shift();
      if (!oldest) break;
      const value = entries.get(oldest);
      if (!value) continue;
      entries.delete(oldest);
      forgetWarmVideo(oldest);

      try {
        dispose(value);
      } catch {}
    }
  };

  return {
    get: (key) => entries.get(key),
    has: (key) => entries.has(key),
    set: (key, value) => {
      entries.set(key, value);
      touch(key);
      trim();
    },
    touch,
    release,
  };
};
