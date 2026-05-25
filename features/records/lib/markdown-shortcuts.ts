export type MarkdownShortcut =
  | 'bold'
  | 'blockquote'
  | 'horizontal-rule'
  | 'italic'
  | 'underline'
  | 'link'
  | 'ordered-list'
  | 'strikethrough'
  | 'unordered-list';

type MarkdownShortcutEditInput = {
  selectionEnd: number;
  selectionStart: number;
  shortcut: MarkdownShortcut;
  text: string;
};

type MarkdownTabEditInput = {
  selectionEnd: number;
  selectionStart: number;
  shiftKey?: boolean;
  text: string;
};

type MarkdownEnterEditInput = {
  selectionEnd: number;
  selectionStart: number;
  text: string;
};

type MarkdownShortcutKeyEvent = {
  altKey?: boolean;
  code?: string;
  ctrlKey?: boolean;
  isComposing?: boolean;
  key: string;
  metaKey?: boolean;
  nativeEvent?: { isComposing?: boolean };
  shiftKey?: boolean;
};

type MarkdownShortcutKeyOptions = { usesMetaKey: boolean };

type MarkdownShortcutEdit = {
  selectionEnd: number;
  selectionStart: number;
  text: string;
};

type PositionEdit = { insert: string; removeCount: number; start: number };
const UNORDERED_LIST_MARKER = '-';
const BLOCKQUOTE_PLACEHOLDER = 'blockquote';
const LIST_INDENT = '  ';
const UNORDERED_LIST_MARKER_PATTERN = /^[-+*–]$/;
const ORDERED_LIST_MARKER_PATTERN = /^\d{1,3}[.)]$/;
const UNORDERED_LIST_PREFIX_PATTERN = /^(\s{0,12})[-+*–]\s+/;
const ORDERED_LIST_PREFIX_PATTERN = /^(\s{0,12})\d{1,3}[.)]\s+/;
const ANY_LIST_PREFIX_PATTERN = /^(\s{0,12})([-+*–]|\d{1,3}[.)])\s+/;
const BLOCKQUOTE_LINE_PATTERN = /^(\s{0,3})>\s?/;

export function getMarkdownShortcutFromKeyEvent(
  event: MarkdownShortcutKeyEvent,
  options: MarkdownShortcutKeyOptions
): MarkdownShortcut | null {
  if (event.altKey) return null;
  if (event.isComposing || event.nativeEvent?.isComposing) return null;
  if (options.usesMetaKey ? !event.metaKey : !event.ctrlKey) return null;
  const key = event.key.toLowerCase();

  if (!event.shiftKey) {
    if (key === 'b') return 'bold';
    if (key === 'i') return 'italic';
    if (key === 'k') return 'link';
    if (key === 'u') return 'underline';
    return null;
  }

  if (event.code === 'Digit7' || key === '7' || key === '&') {
    return 'ordered-list';
  }

  if (event.code === 'Digit8' || key === '8' || key === '*') {
    return 'unordered-list';
  }

  return null;
}

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

  if (shortcut === 'strikethrough') {
    return getWrappedEdit({
      end,
      marker: '~~',
      placeholder: 'strikethrough',
      start,
      text,
    });
  }

  if (shortcut === 'underline') {
    return getWrappedEdit({
      closeMarker: '</u>',
      end,
      marker: '<u>',
      placeholder: 'underline',
      start,
      text,
    });
  }

  if (shortcut === 'link') return getLinkEdit({ end, start, text });
  if (shortcut === 'blockquote') return getBlockquoteEdit({ end, start, text });

  if (shortcut === 'horizontal-rule') {
    return getHorizontalRuleEdit({ end, start, text });
  }

  return getListEdit({
    marker: shortcut === 'ordered-list' ? 'ordered' : 'unordered',
    selectionEnd: end,
    selectionStart: start,
    text,
  });
}

export function getMarkdownTabEdit({
  selectionEnd,
  selectionStart,
  shiftKey,
  text,
}: MarkdownTabEditInput): MarkdownShortcutEdit | undefined {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);

  if (!shiftKey) {
    const linkTargetSelection = getLinkTargetSelection({ end, start, text });

    if (linkTargetSelection) {
      return {
        selectionEnd: linkTargetSelection.end,
        selectionStart: linkTargetSelection.start,
        text,
      };
    }

    const linkEndSelection = getLinkEndSelection({ end, start, text });

    if (linkEndSelection) {
      return {
        selectionEnd: linkEndSelection.end,
        selectionStart: linkEndSelection.start,
        text,
      };
    }
  }

  return getListIndentEdit({
    direction: shiftKey ? 'outdent' : 'indent',
    selectionEnd: end,
    selectionStart: start,
    text,
  });
}

export function getMarkdownEnterEdit({
  selectionEnd,
  selectionStart,
  text,
}: MarkdownEnterEditInput): MarkdownShortcutEdit | undefined {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  const linkEndSelection = getLinkEndSelection({ end, start, text });
  if (!linkEndSelection) return;

  return {
    selectionEnd: linkEndSelection.end,
    selectionStart: linkEndSelection.start,
    text,
  };
}

function getWrappedEdit({
  closeMarker,
  end,
  marker,
  placeholder,
  start,
  text,
}: {
  closeMarker?: string;
  end: number;
  marker: string;
  placeholder: string;
  start: number;
  text: string;
}): MarkdownShortcutEdit {
  const selectedText = text.slice(start, end);
  const resolvedCloseMarker = closeMarker ?? marker;

  const unwrappedEdit = getUnwrappedEdit({
    closeMarker: resolvedCloseMarker,
    end,
    marker,
    selectedText,
    start,
    text,
  });

  if (unwrappedEdit) return unwrappedEdit;

  const listItemContentEdit = getListItemContentWrappedEdit({
    closeMarker: resolvedCloseMarker,
    end,
    marker,
    placeholder,
    start,
    text,
  });

  if (listItemContentEdit) return listItemContentEdit;

  const wordRange =
    start === end ? getCursorWordRange({ position: start, text }) : undefined;

  const wrapStart = wordRange?.start ?? start;
  const wrapEnd = wordRange?.end ?? end;

  const content = wordRange
    ? text.slice(wrapStart, wrapEnd)
    : selectedText || placeholder;

  const nextText =
    text.slice(0, wrapStart) +
    marker +
    content +
    resolvedCloseMarker +
    text.slice(wrapEnd);

  const nextSelectionStart = wrapStart + marker.length;

  return {
    selectionEnd: nextSelectionStart + content.length,
    selectionStart: nextSelectionStart,
    text: nextText,
  };
}

function getListItemContentWrappedEdit({
  closeMarker,
  end,
  marker,
  placeholder,
  start,
  text,
}: {
  closeMarker: string;
  end: number;
  marker: string;
  placeholder: string;
  start: number;
  text: string;
}): MarkdownShortcutEdit | undefined {
  if (start === end) return;

  const range = getLineRange({
    selectionEnd: end,
    selectionStart: start,
    text,
  });

  const lines = range.text.split('\n');
  const nextLines: string[] = [];
  let offset = 0;
  let positionDelta = 0;
  let nextSelectionEnd: number | undefined;
  let nextSelectionStart: number | undefined;
  let wrappedLineCount = 0;

  for (const line of lines) {
    const lineStart = range.start + offset;
    offset += line.length + 1;

    if (!line.trim()) {
      nextLines.push(line);
      continue;
    }

    const match = getAnyListPrefixMatch(line);
    if (!match) return;
    const contentStart = lineStart + match[0].length;
    const contentEnd = lineStart + line.length;
    if (start > contentStart || end < contentEnd) return;
    const content = line.slice(match[0].length);

    const replacement = toggleWrappedContent({
      closeMarker,
      content,
      marker,
      placeholder,
    });

    const nextContentStart =
      contentStart + positionDelta + replacement.selectionStart;

    const nextContentEnd =
      contentStart + positionDelta + replacement.selectionEnd;

    nextSelectionStart ??= nextContentStart;
    nextSelectionEnd = nextContentEnd;
    positionDelta += replacement.text.length - content.length;
    wrappedLineCount++;
    nextLines.push(line.slice(0, match[0].length) + replacement.text);
  }

  if (
    wrappedLineCount === 0 ||
    nextSelectionStart === undefined ||
    nextSelectionEnd === undefined
  ) {
    return;
  }

  return {
    selectionEnd: nextSelectionEnd,
    selectionStart: nextSelectionStart,
    text:
      text.slice(0, range.start) + nextLines.join('\n') + text.slice(range.end),
  };
}

function toggleWrappedContent({
  closeMarker,
  content,
  marker,
  placeholder,
}: {
  closeMarker: string;
  content: string;
  marker: string;
  placeholder: string;
}) {
  if (
    content.startsWith(marker) &&
    content.endsWith(closeMarker) &&
    content.length >= marker.length + closeMarker.length
  ) {
    const unwrapped = content.slice(
      marker.length,
      content.length - closeMarker.length
    );

    return {
      selectionEnd: unwrapped.length,
      selectionStart: 0,
      text: unwrapped,
    };
  }

  const wrappedContent = content || placeholder;

  return {
    selectionEnd: marker.length + wrappedContent.length,
    selectionStart: marker.length,
    text: marker + wrappedContent + closeMarker,
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
  const link = getContainingMarkdownLink({ end, start, text });

  if (link) {
    return {
      selectionEnd: link.start + link.label.length,
      selectionStart: link.start,
      text: text.slice(0, link.start) + link.label + text.slice(link.end),
    };
  }

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

function getLinkTargetSelection({
  end,
  start,
  text,
}: {
  end: number;
  start: number;
  text: string;
}) {
  const link = getContainingMarkdownLink({ end, start, text });
  if (!link) return;
  if (start < link.labelStart || end > link.labelEnd) return;
  return { end: link.hrefEnd, start: link.hrefStart };
}

function getLinkEndSelection({
  end,
  start,
  text,
}: {
  end: number;
  start: number;
  text: string;
}) {
  const link = getContainingMarkdownLink({ end, start, text });
  if (!link) return;
  if (start < link.hrefStart || end > link.hrefEnd) return;
  return { end: link.end, start: link.end };
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
  const unprefixedEdit = getLinePrefixRemovalEdit({
    getMatch:
      marker === 'ordered'
        ? getOrderedListPrefixMatch
        : getUnorderedListPrefixMatch,
    selectionEnd,
    selectionStart,
    text,
  });

  if (unprefixedEdit) return unprefixedEdit;

  const conversionEdit = getListConversionEdit({
    marker,
    selectionEnd,
    selectionStart,
    text,
  });

  if (conversionEdit) return conversionEdit;

  return getLinePrefixEdit({
    getPrefix: (_line, index) =>
      marker === 'ordered' ? `${index + 1}. ` : `${UNORDERED_LIST_MARKER} `,
    selectionEnd,
    selectionStart,
    text,
  });
}

function getListConversionEdit({
  marker,
  selectionEnd,
  selectionStart,
  text,
}: {
  marker: 'ordered' | 'unordered';
  selectionEnd: number;
  selectionStart: number;
  text: string;
}): MarkdownShortcutEdit | undefined {
  const range = getLineRange({ selectionEnd, selectionStart, text });
  const lines = range.text.split('\n');
  const edits: PositionEdit[] = [];
  let offset = 0;
  let convertedCount = 0;
  let listItemIndex = 0;
  const nextLines: string[] = [];

  for (const line of lines) {
    const lineStart = range.start + offset;
    offset += line.length + 1;

    if (!line.trim()) {
      nextLines.push(line);
      continue;
    }

    const match = getAnyListPrefixMatch(line);
    if (!match) return;
    const currentMarker = match[2];
    const nextListItemIndex = listItemIndex++;

    const isTargetMarker =
      marker === 'ordered'
        ? isOrderedListMarker(currentMarker)
        : isUnorderedListMarker(currentMarker);

    if (isTargetMarker) {
      nextLines.push(line);
      continue;
    }

    const nextMarker =
      marker === 'ordered' ? `${nextListItemIndex + 1}. ` : '- ';

    const markerStart = lineStart + match[1].length;
    const removeCount = match[0].length - match[1].length;
    edits.push({ insert: nextMarker, removeCount, start: markerStart });
    convertedCount++;

    nextLines.push(
      line.slice(0, match[1].length) + nextMarker + line.slice(match[0].length)
    );
  }

  if (convertedCount === 0) return;

  return {
    selectionEnd: mapPositionThroughLineEdits(selectionEnd, edits),
    selectionStart: mapPositionThroughLineEdits(selectionStart, edits),
    text:
      text.slice(0, range.start) + nextLines.join('\n') + text.slice(range.end),
  };
}

function getListIndentEdit({
  direction,
  selectionEnd,
  selectionStart,
  text,
}: {
  direction: 'indent' | 'outdent';
  selectionEnd: number;
  selectionStart: number;
  text: string;
}): MarkdownShortcutEdit | undefined {
  const range = getLineRange({ selectionEnd, selectionStart, text });
  const lines = range.text.split('\n');
  const edits: PositionEdit[] = [];
  let offset = 0;

  const nextLines = lines.map((line) => {
    const lineStart = range.start + offset;
    offset += line.length + 1;
    const listItem = getAnyListPrefixMatch(line);
    if (!listItem) return line;

    if (direction === 'indent') {
      edits.push({ insert: LIST_INDENT, removeCount: 0, start: lineStart });
      return `${LIST_INDENT}${line}`;
    }

    const removeCount = Math.min(LIST_INDENT.length, listItem[1].length);
    if (removeCount === 0) return line;
    edits.push({ insert: '', removeCount, start: lineStart });
    return line.slice(removeCount);
  });

  if (edits.length === 0) return;

  return {
    selectionEnd: mapPositionThroughLineEdits(selectionEnd, edits),
    selectionStart: mapPositionThroughLineEdits(selectionStart, edits),
    text:
      text.slice(0, range.start) + nextLines.join('\n') + text.slice(range.end),
  };
}

function getBlockquoteEdit({
  end,
  start,
  text,
}: {
  end: number;
  start: number;
  text: string;
}): MarkdownShortcutEdit {
  const unprefixedEdit = getLinePrefixRemovalEdit({
    getMatch: getBlockquotePrefixMatch,
    selectionEnd: end,
    selectionStart: start,
    text,
  });

  if (unprefixedEdit) return unprefixedEdit;

  if (start === end) {
    const lineStart = text.slice(0, start).lastIndexOf('\n') + 1;
    const nextLineBreak = text.indexOf('\n', start);
    const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;

    if (!text.slice(lineStart, lineEnd).trim()) {
      const prefix = '> ';
      const nextSelectionStart = lineStart + prefix.length;

      return {
        selectionEnd: nextSelectionStart + BLOCKQUOTE_PLACEHOLDER.length,
        selectionStart: nextSelectionStart,
        text:
          text.slice(0, lineStart) +
          prefix +
          BLOCKQUOTE_PLACEHOLDER +
          text.slice(lineEnd),
      };
    }
  }

  return getLinePrefixEdit({
    getPrefix: () => '> ',
    selectionEnd: end,
    selectionStart: start,
    text,
  });
}

function getLinePrefixEdit({
  getPrefix,
  selectionEnd,
  selectionStart,
  text,
}: {
  getPrefix: (line: string, index: number) => string;
  selectionEnd: number;
  selectionStart: number;
  text: string;
}): MarkdownShortcutEdit {
  const range = getLineRange({ selectionEnd, selectionStart, text });
  const lines = range.text.split('\n');
  let offset = 0;
  let selectionStartShift = 0;
  let selectionEndShift = 0;

  const prefixedLines = lines.map((line, index) => {
    const prefix = getPrefix(line, index);
    const lineStart = range.start + offset;
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
    text: text.slice(0, range.start) + nextRange + text.slice(range.end),
  };
}

function getUnwrappedEdit({
  closeMarker,
  end,
  marker,
  selectedText,
  start,
  text,
}: {
  closeMarker: string;
  end: number;
  marker: string;
  selectedText: string;
  start: number;
  text: string;
}): MarkdownShortcutEdit | undefined {
  if (
    selectedText &&
    hasIsolatedWrappingMarkers({ closeMarker, end, marker, start, text })
  ) {
    return {
      selectionEnd: end - marker.length,
      selectionStart: start - marker.length,
      text:
        text.slice(0, start - marker.length) +
        selectedText +
        text.slice(end + closeMarker.length),
    };
  }

  if (
    selectedText &&
    selectedText.startsWith(marker) &&
    selectedText.endsWith(closeMarker) &&
    selectedText.length >= marker.length + closeMarker.length
  ) {
    const content = selectedText.slice(
      marker.length,
      selectedText.length - closeMarker.length
    );

    return {
      selectionEnd: start + content.length,
      selectionStart: start,
      text: text.slice(0, start) + content + text.slice(end),
    };
  }

  return getContainingWrappedEdit({ closeMarker, end, marker, start, text });
}

function hasIsolatedWrappingMarkers({
  closeMarker,
  end,
  marker,
  start,
  text,
}: {
  closeMarker: string;
  end: number;
  marker: string;
  start: number;
  text: string;
}) {
  const markerStart = start - marker.length;
  if (markerStart < 0) return false;
  if (text.slice(markerStart, start) !== marker) return false;
  if (text.slice(end, end + closeMarker.length) !== closeMarker) return false;

  if (marker.length === 1 && closeMarker === marker) {
    if (text[markerStart - 1] === marker) return false;
    if (text[end + closeMarker.length] === closeMarker) return false;
  }

  return true;
}

function getContainingWrappedEdit({
  closeMarker,
  end,
  marker,
  start,
  text,
}: {
  closeMarker: string;
  end: number;
  marker: string;
  start: number;
  text: string;
}): MarkdownShortcutEdit | undefined {
  const line = getInlineLineRange({ end, start, text });
  if (!line) return;

  for (
    let openStart = text.lastIndexOf(marker, start);
    openStart !== -1;
    openStart = getPreviousInlineMarkerIndex({ marker, openStart, text })
  ) {
    if (openStart < line.start) break;
    const contentStart = openStart + marker.length;
    const closeStart = text.indexOf(closeMarker, contentStart);
    if (closeStart === -1) continue;
    const closeEnd = closeStart + closeMarker.length;
    if (closeEnd > line.end) continue;
    if (start < contentStart || end > closeStart) continue;
    if (marker.length === 1 && text[openStart - 1] === marker) continue;
    if (marker.length === 1 && text[contentStart] === marker) continue;

    return {
      selectionEnd: Math.max(contentStart, end - marker.length),
      selectionStart: Math.max(contentStart, start - marker.length),
      text:
        text.slice(0, openStart) +
        text.slice(contentStart, closeStart) +
        text.slice(closeEnd),
    };
  }
}

function getPreviousInlineMarkerIndex({
  marker,
  openStart,
  text,
}: {
  marker: string;
  openStart: number;
  text: string;
}) {
  if (openStart <= 0) return -1;
  return text.lastIndexOf(marker, openStart - 1);
}

function getInlineLineRange({
  end,
  start,
  text,
}: {
  end: number;
  start: number;
  text: string;
}) {
  const lineStart = text.slice(0, start).lastIndexOf('\n') + 1;
  const nextLineBreak = text.indexOf('\n', start);
  const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;
  if (end > lineEnd) return;
  return { end: lineEnd, start: lineStart };
}

function getContainingMarkdownLink({
  end,
  start,
  text,
}: {
  end: number;
  start: number;
  text: string;
}) {
  const linkPattern = /\[([^\]\n]+)\]\(([^\)\n]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(text))) {
    const labelStart = match.index + 1;
    const labelEnd = labelStart + match[1].length;
    const hrefStart = labelEnd + 2;
    const hrefEnd = hrefStart + match[2].length;
    const linkEnd = hrefEnd + 1;
    if (start < match.index || end > linkEnd) continue;

    return {
      end: linkEnd,
      hrefEnd,
      hrefStart,
      label: match[1],
      labelEnd,
      labelStart,
      start: match.index,
    };
  }
}

function getLinePrefixRemovalEdit({
  getMatch,
  selectionEnd,
  selectionStart,
  text,
}: {
  getMatch: (line: string) => RegExpExecArray | null;
  selectionEnd: number;
  selectionStart: number;
  text: string;
}): MarkdownShortcutEdit | undefined {
  const range = getLineRange({ selectionEnd, selectionStart, text });
  const lines = range.text.split('\n');
  const edits: PositionEdit[] = [];
  let offset = 0;
  let matchedLineCount = 0;
  const nextLines: string[] = [];

  for (const line of lines) {
    const lineStart = range.start + offset;
    offset += line.length + 1;

    if (!line.trim()) {
      nextLines.push(line);
      continue;
    }

    const match = getMatch(line);
    if (!match) return;
    matchedLineCount++;
    const markerStart = lineStart + match[1].length;
    const removeCount = match[0].length - match[1].length;
    edits.push({ insert: '', removeCount, start: markerStart });

    nextLines.push(
      line.slice(0, match[1].length) + line.slice(match[0].length)
    );
  }

  if (matchedLineCount === 0) return;

  return {
    selectionEnd: mapPositionThroughLineEdits(selectionEnd, edits),
    selectionStart: mapPositionThroughLineEdits(selectionStart, edits),
    text:
      text.slice(0, range.start) + nextLines.join('\n') + text.slice(range.end),
  };
}

function getLineRange({
  selectionEnd,
  selectionStart,
  text,
}: {
  selectionEnd: number;
  selectionStart: number;
  text: string;
}) {
  const start = text.slice(0, selectionStart).lastIndexOf('\n') + 1;

  const effectiveSelectionEnd =
    selectionEnd > selectionStart && text[selectionEnd - 1] === '\n'
      ? selectionEnd - 1
      : selectionEnd;

  const nextLineBreak = text.indexOf('\n', effectiveSelectionEnd);
  const end = nextLineBreak === -1 ? text.length : nextLineBreak;
  return { end, start, text: text.slice(start, end) };
}

function getUnorderedListPrefixMatch(line: string) {
  return UNORDERED_LIST_PREFIX_PATTERN.exec(line);
}

function getOrderedListPrefixMatch(line: string) {
  return ORDERED_LIST_PREFIX_PATTERN.exec(line);
}

function getAnyListPrefixMatch(line: string) {
  return ANY_LIST_PREFIX_PATTERN.exec(line);
}

function getBlockquotePrefixMatch(line: string) {
  return BLOCKQUOTE_LINE_PATTERN.exec(line);
}

function getCursorWordRange({
  position,
  text,
}: {
  position: number;
  text: string;
}) {
  if (
    !isWordCharacter(text[position - 1]) ||
    !isWordCharacter(text[position])
  ) {
    return;
  }

  let start = position - 1;
  let end = position;
  while (start > 0 && isWordCharacter(text[start - 1])) start--;
  while (end < text.length && isWordCharacter(text[end])) end++;
  return { end, start };
}

function isWordCharacter(character: string | undefined) {
  return character != null && /[\p{L}\p{N}_]/u.test(character);
}

function isUnorderedListMarker(marker: string) {
  return UNORDERED_LIST_MARKER_PATTERN.test(marker);
}

function isOrderedListMarker(marker: string) {
  return ORDERED_LIST_MARKER_PATTERN.test(marker);
}

function mapPositionThroughLineEdits(position: number, edits: PositionEdit[]) {
  let delta = 0;

  for (const edit of edits) {
    const editEnd = edit.start + edit.removeCount;
    if (position < edit.start) break;
    if (position === edit.start) return edit.start + delta + edit.insert.length;
    if (position <= editEnd) return edit.start + delta + edit.insert.length;
    delta += edit.insert.length - edit.removeCount;
  }

  return position + delta;
}

function getHorizontalRuleEdit({
  end,
  start,
  text,
}: {
  end: number;
  start: number;
  text: string;
}): MarkdownShortcutEdit {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const prefix = before && !before.endsWith('\n') ? '\n' : '';
  const suffix = after && !after.startsWith('\n') ? '\n' : '';
  const insert = `${prefix}---${suffix}`;
  const selection = start + prefix.length + 3;

  return {
    selectionEnd: selection,
    selectionStart: selection,
    text: before + insert + after,
  };
}
