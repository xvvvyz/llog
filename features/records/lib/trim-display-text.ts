const EXCESS_NEWLINES_REGEX = /(?:\r\n|\r|\n){3,}/g;

export const trimDisplayText = (text?: string | null) =>
  (text ?? '').trim().replace(EXCESS_NEWLINES_REGEX, '\n\n');
