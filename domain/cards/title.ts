export const CARD_TITLE_MAX_LENGTH = 80;

// Card titles are human-authored text (by the model or taken from the prompt),
// so preserve their wording: only trim, collapse whitespace, drop a leading
// markdown heading or wrapping quotes, and cap the length at a word boundary.
// (normalizeCardDisplayLabel is for deriving compact metric/axis labels and
// would strip apostrophes to spaces, lowercase, and word-limit — wrong here.)
export const normalizeCardTitle = (
  value: unknown,
  maxLength = CARD_TITLE_MAX_LENGTH
) => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;

  const text = String(value)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^#+\s+/, '')
    .replace(/^["“”`]+|["“”`]+$/g, '')
    .trim();

  if (!text) return undefined;
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(' ');
  return (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trim();
};

export const fallbackCardTitle = (
  prompt: string,
  maxLength = CARD_TITLE_MAX_LENGTH
) => {
  const firstLine = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return normalizeCardTitle(firstLine ?? prompt, maxLength) ?? 'Progress card';
};
