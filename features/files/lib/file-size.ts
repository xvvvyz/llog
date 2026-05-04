export const formatFileSize = (size?: number | null) => {
  if (!Number.isFinite(size) || size == null || size < 0) return null;
  if (size < 1024) return `${Math.round(size)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};
