import * as cardOutput from '@/domain/cards/output';

export const getString = (value: unknown) =>
  typeof value === 'string' ? value : undefined;

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

export const cleanNullableObject = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .map(cleanNullableObject)
      .filter((item) => item !== undefined && item !== null);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, cleanNullableObject(item)] as const)
      .filter(([, item]) => item !== undefined && item !== null);

    if (!entries.length) return undefined;
    return Object.fromEntries(entries);
  }

  return value;
};

export const cleanTitle = (value: unknown, defaultValue: string) =>
  cardOutput.normalizeCardDisplayLabel({
    defaultValue,
    maxLength: cardOutput.MAX_CARD_GENERATED_TITLE_LENGTH,
    maxWords: 5,
    value,
  }) ?? 'Progress card';

export const defaultTitleFromPrompt = (prompt: string) => {
  const firstLine = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return cleanTitle(firstLine ?? prompt, 'Progress card');
};

export const compactText = (value?: string | null, maxLength = Infinity) => {
  const text = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};
