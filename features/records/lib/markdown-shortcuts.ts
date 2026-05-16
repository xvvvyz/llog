export type MarkdownShortcut =
  | 'bold'
  | 'italic'
  | 'link'
  | 'ordered-list'
  | 'unordered-list';

type MarkdownShortcutEditInput = {
  selectionEnd: number;
  selectionStart: number;
  shortcut: MarkdownShortcut;
  text: string;
};

type MarkdownShortcutEdit = {
  selectionEnd: number;
  selectionStart: number;
  text: string;
};

export function getMarkdownShortcutEdit({
  selectionEnd,
  selectionStart,
  shortcut,
  text,
}: MarkdownShortcutEditInput): MarkdownShortcutEdit {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);

  if (shortcut === 'bold') {
    return getWrappedEdit({
      end,
      marker: '**',
      placeholder: 'bold',
      start,
      text,
    });
  }

  if (shortcut === 'italic') {
    return getWrappedEdit({
      end,
      marker: '*',
      placeholder: 'italic',
      start,
      text,
    });
  }

  if (shortcut === 'link') return getLinkEdit({ end, start, text });

  return getListEdit({
    marker: shortcut === 'ordered-list' ? 'ordered' : 'unordered',
    selectionEnd: end,
    selectionStart: start,
    text,
  });
}

function getWrappedEdit({
  end,
  marker,
  placeholder,
  start,
  text,
}: {
  end: number;
  marker: string;
  placeholder: string;
  start: number;
  text: string;
}): MarkdownShortcutEdit {
  const selectedText = text.slice(start, end);
  const content = selectedText || placeholder;

  const nextText =
    text.slice(0, start) + marker + content + marker + text.slice(end);

  const nextSelectionStart = start + marker.length;

  return {
    selectionEnd: nextSelectionStart + content.length,
    selectionStart: nextSelectionStart,
    text: nextText,
  };
}

function getLinkEdit({
  end,
  start,
  text,
}: {
  end: number;
  start: number;
  text: string;
}): MarkdownShortcutEdit {
  const selectedText = text.slice(start, end);
  const label = selectedText || 'text';
  const href = 'url';

  const nextText = `${text.slice(0, start)}[${label}](${href})${text.slice(
    end
  )}`;

  if (!selectedText) {
    return {
      selectionEnd: start + 1 + label.length,
      selectionStart: start + 1,
      text: nextText,
    };
  }

  const hrefStart = start + label.length + 3;

  return {
    selectionEnd: hrefStart + href.length,
    selectionStart: hrefStart,
    text: nextText,
  };
}

function getListEdit({
  marker,
  selectionEnd,
  selectionStart,
  text,
}: {
  marker: 'ordered' | 'unordered';
  selectionEnd: number;
  selectionStart: number;
  text: string;
}): MarkdownShortcutEdit {
  const rangeStart = text.slice(0, selectionStart).lastIndexOf('\n') + 1;

  const effectiveSelectionEnd =
    selectionEnd > selectionStart && text[selectionEnd - 1] === '\n'
      ? selectionEnd - 1
      : selectionEnd;

  const nextLineBreak = text.indexOf('\n', effectiveSelectionEnd);
  const rangeEnd = nextLineBreak === -1 ? text.length : nextLineBreak;
  const range = text.slice(rangeStart, rangeEnd);
  const lines = range.split('\n');
  let offset = 0;
  let selectionStartShift = 0;
  let selectionEndShift = 0;

  const prefixedLines = lines.map((line, index) => {
    const prefix = marker === 'ordered' ? `${index + 1}. ` : '- ';
    const lineStart = rangeStart + offset;
    if (lineStart <= selectionStart) selectionStartShift += prefix.length;

    if (lineStart < selectionEnd || selectionStart === selectionEnd) {
      selectionEndShift += prefix.length;
    }

    offset += line.length + 1;
    return `${prefix}${line}`;
  });

  const nextRange = prefixedLines.join('\n');

  return {
    selectionEnd: selectionEnd + selectionEndShift,
    selectionStart: selectionStart + selectionStartShift,
    text: text.slice(0, rangeStart) + nextRange + text.slice(rangeEnd),
  };
}
