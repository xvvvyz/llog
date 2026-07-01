import * as markdown from '@/domain/records/markdown';

// Resolves a label from a single line, ignoring inline markdown so emphasized
// labels render as labels rather than inline formatted text. A line is a label
// when its plain text ends in a colon (Notes:, **Notes:**) or when the whole
// line is a single emphasized run (**Duration (seconds)**, *Mood*).
export const parseTemplateLabel = (lineText: string) => {
  const trimmed = lineText.trim();
  if (!trimmed) return undefined;
  const plain = markdown.recordMarkdownToPlainText(trimmed);
  const colonMatch = plain.match(/^(.*?)[:：]$/);
  if (colonMatch) return colonMatch[1]?.trim() || undefined;
  return isFullyEmphasized(trimmed) ? plain || undefined : undefined;
};

const isFullyEmphasized = (text: string) => {
  const inlines = markdown.parseRecordMarkdownInline(text);
  const node = inlines.length === 1 ? inlines[0] : undefined;
  return !!node && node.kind !== 'text' && node.kind !== 'link';
};
