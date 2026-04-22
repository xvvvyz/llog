export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

export const clampIndex = (index: number, count: number) => {
  if (count <= 0) return 0;
  const normalized = Number.isFinite(index) ? Math.trunc(index) : 0;
  return Math.max(0, Math.min(normalized, count - 1));
};
