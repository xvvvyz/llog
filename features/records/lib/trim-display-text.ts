const EXCESS_NEWLINES_REGEX = /(?:\r\n|\r|\n){3,}/g;
const LINE_BREAK_REGEX = /\r\n|\r|\n/;

export const trimDisplayText = (text?: string | null) =>
  (text ?? '').trim().replace(EXCESS_NEWLINES_REGEX, '\n\n');

export const getCollapsedPreviewNumberOfLines = ({
  numberOfLines,
  text,
}: {
  numberOfLines?: number;
  text: string;
}) => {
  if (!numberOfLines) return undefined;
  const lines = text.split(LINE_BREAK_REGEX);
  if (lines.length <= numberOfLines) return numberOfLines;
  let previewNumberOfLines = numberOfLines;

  while (previewNumberOfLines > 1 && !lines[previewNumberOfLines - 1]?.trim()) {
    previewNumberOfLines--;
  }

  return previewNumberOfLines;
};
