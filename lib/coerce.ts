export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const asString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export const asId = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return asString(value);
};

export const asNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
