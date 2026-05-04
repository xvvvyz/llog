export const durationMsToSeconds = (durationMs?: number | null) =>
  typeof durationMs === 'number' &&
  Number.isFinite(durationMs) &&
  durationMs >= 0
    ? durationMs / 1000
    : undefined;

export const durationSecondsToMs = (durationSeconds?: number | null) =>
  typeof durationSeconds === 'number' &&
  Number.isFinite(durationSeconds) &&
  durationSeconds >= 0
    ? Math.round(durationSeconds * 1000)
    : undefined;

export const positiveDurationSeconds = (durationSeconds?: number | null) =>
  typeof durationSeconds === 'number' &&
  Number.isFinite(durationSeconds) &&
  durationSeconds > 0
    ? durationSeconds
    : undefined;
