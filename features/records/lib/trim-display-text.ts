const EXCESS_NEWLINES_REGEX = /(?:\r\n|\r|\n){3,}/g;
const LINE_BREAK_REGEX = /\r\n|\r|\n/;

export const trimDisplayText = (text?: string | null) =>
  (text ?? '').trim().replace(EXCESS_NEWLINES_REGEX, '\n\n');

export const hasExplicitLineBreaks = (text: string) =>
  LINE_BREAK_REGEX.test(text);

export const getCollapsedPreview = ({
  numberOfLines,
  text,
}: {
  numberOfLines?: number;
  text: string;
}) => {
  if (!numberOfLines) {
    return { isLineTruncated: false, numberOfLines: undefined, text };
  }

  const lines = text.split(LINE_BREAK_REGEX);
  if (lines.length <= 1) return { isLineTruncated: false, numberOfLines, text };

  if (lines.length <= numberOfLines) {
    return { isLineTruncated: false, numberOfLines: undefined, text };
  }

  let previewNumberOfLines = numberOfLines;

  while (previewNumberOfLines > 1 && !lines[previewNumberOfLines - 1]?.trim()) {
    previewNumberOfLines--;
  }

  return {
    isLineTruncated: true,
    numberOfLines: undefined,
    text: lines.slice(0, previewNumberOfLines).join('\n'),
  };
};
