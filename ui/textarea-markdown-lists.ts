type MarkdownListEnterInput = {
  selectionEnd: number;
  selectionStart: number;
  text: string;
};

type MarkdownListEnterEdit = {
  selectionEnd: number;
  selectionStart: number;
  text: string;
};

const MARKDOWN_LIST_ITEM_PATTERN = /^(\s{0,12})([-+*]|\d{1,3}[.)])(\s+)(.*)$/;

export function getMarkdownListEnterEdit({
  selectionEnd,
  selectionStart,
  text,
}: MarkdownListEnterInput): MarkdownListEnterEdit | undefined {
  if (selectionStart !== selectionEnd) return;
  const lineStart = text.slice(0, selectionStart).lastIndexOf('\n') + 1;
  const nextLineBreak = text.indexOf('\n', selectionStart);
  const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;
  const line = text.slice(lineStart, lineEnd);
  const listItem = MARKDOWN_LIST_ITEM_PATTERN.exec(line);
  if (!listItem) return;
  const [, indent, marker, markerSpacing, content] = listItem;

  const markerEnd =
    lineStart + indent.length + marker.length + markerSpacing.length;

  if (selectionStart < markerEnd) return;

  if (!content.trim()) {
    return {
      selectionEnd: lineStart,
      selectionStart: lineStart,
      text: text.slice(0, lineStart) + text.slice(lineEnd),
    };
  }

  const nextMarker = getNextMarkdownListMarker(marker);
  if (!nextMarker) return;
  const nextPrefix = `${indent}${nextMarker} `;
  const insertText = `\n${nextPrefix}`;
  const nextSelection = selectionStart + insertText.length;

  return {
    selectionEnd: nextSelection,
    selectionStart: nextSelection,
    text: text.slice(0, selectionStart) + insertText + text.slice(selectionEnd),
  };
}

function getNextMarkdownListMarker(marker: string) {
  if (/^[-+*]$/.test(marker)) return marker;
  const orderedMarker = /^(\d{1,3})([.)])$/.exec(marker);
  if (!orderedMarker) return;
  const nextNumber = Number(orderedMarker[1]) + 1;
  if (nextNumber > 999) return;
  return `${nextNumber}${orderedMarker[2]}`;
}
