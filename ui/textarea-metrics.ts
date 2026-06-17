export const TEXTAREA_FONT_SIZE = 16;

// Matches the leading-6 utility (1.5x) the textarea inherited from `text-base`
// before its style moved to an inline object. Used both as the rendered
// lineHeight and for row math so the measured height stays in sync with the
// rendered text — a mismatch here is what made iOS multiline scroll clip the
// last line.
export const TEXTAREA_LINE_HEIGHT = 24;

const TEXTAREA_AVERAGE_CHARACTER_WIDTH = 8;

const TEXTAREA_SIZE_METRICS = {
  default: { paddingHorizontal: 16, paddingVertical: 10 },
  sm: { paddingHorizontal: 12, paddingVertical: 8 },
} as const;

export type TextareaSize = keyof typeof TEXTAREA_SIZE_METRICS;

const getTextareaSizePadding = (size: TextareaSize) => {
  const { paddingHorizontal, paddingVertical } = TEXTAREA_SIZE_METRICS[size];

  return {
    horizontalPadding: paddingHorizontal * 2,
    paddingBottom: paddingVertical,
    paddingHorizontal,
    paddingTop: paddingVertical,
    verticalPadding: paddingVertical * 2,
  };
};

export const TEXTAREA_SIZE_PADDING = {
  default: getTextareaSizePadding('default'),
  sm: getTextareaSizePadding('sm'),
} as const;

export const getEstimatedTextareaContentHeight = ({
  horizontalPadding,
  text,
  verticalPadding,
  width,
}: {
  horizontalPadding: number;
  text: string;
  verticalPadding: number;
  width?: number;
}) => {
  const contentWidth = width ? width - horizontalPadding : 0;

  const estimatedCharactersPerLine =
    contentWidth > 0
      ? Math.max(1, Math.floor(contentWidth / TEXTAREA_AVERAGE_CHARACTER_WIDTH))
      : undefined;

  const lineCount = text.split(/\r\n|\r|\n/).reduce((count, line) => {
    const estimatedWrappedLines = estimatedCharactersPerLine
      ? Math.ceil(line.length / estimatedCharactersPerLine)
      : 1;

    return count + Math.max(1, estimatedWrappedLines);
  }, 0);

  return Math.max(1, lineCount) * TEXTAREA_LINE_HEIGHT + verticalPadding;
};
