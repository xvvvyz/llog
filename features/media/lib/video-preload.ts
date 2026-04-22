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

export const isNearVideoStart = (currentTime: number) =>
  !Number.isFinite(currentTime) || currentTime <= VIDEO_START_THRESHOLD_SECONDS;
