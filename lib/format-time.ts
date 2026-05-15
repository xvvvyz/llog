export const formatTime = (seconds: number) => {
  const totalSeconds =
    Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;

  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const formatCompactDuration = (seconds?: number | null) => {
  if (
    typeof seconds !== 'number' ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return null;
  }

  const totalSeconds = Math.round(seconds);
  if (totalSeconds <= 0) return null;
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};
