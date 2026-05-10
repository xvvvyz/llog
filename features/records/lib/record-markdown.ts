export type RecordMarkdownInline =
  | { kind: 'text'; text: string }
  | { children: RecordMarkdownInline[]; href: string; kind: 'link' }
  | {
      children: RecordMarkdownInline[];
      kind: 'bold' | 'italic' | 'strikethrough' | 'underline';
    };

export type RecordMarkdownBlock =
  | { children: RecordMarkdownInline[]; kind: 'paragraph' | 'title' }
  | {
      children: RecordMarkdownInline[];
      indent: number;
      kind: 'list-item';
      marker: string;
    };

type InlineToken = {
  kind: Exclude<RecordMarkdownInline['kind'], 'link' | 'text'>;
  marker: string;
};

const INLINE_TOKENS: InlineToken[] = [
  { kind: 'bold', marker: '**' },
  { kind: 'strikethrough', marker: '~~' },
  { kind: 'underline', marker: '++' },
  { kind: 'italic', marker: '*' },
  { kind: 'italic', marker: '_' },
];

export function parseRecordMarkdown(text: string): RecordMarkdownBlock[] {
  return text.split('\n').map((line) => parseRecordMarkdownLine(line));
}

function parseRecordMarkdownLine(line: string): RecordMarkdownBlock {
  const title = /^(#{1,6})\s+(.+)$/.exec(line);

  if (title) {
    return { children: parseRecordMarkdownInline(title[2]), kind: 'title' };
  }

  const unorderedListItem = /^(\s{0,12})([-+*])\s+(.+)$/.exec(line);

  if (unorderedListItem) {
    return {
      children: parseRecordMarkdownInline(unorderedListItem[3]),
      indent: Math.floor(unorderedListItem[1].length / 2),
      kind: 'list-item',
      marker: '-',
    };
  }

  const orderedListItem = /^(\s{0,12})(\d{1,3})[.)]\s+(.+)$/.exec(line);

  if (orderedListItem) {
    return {
      children: parseRecordMarkdownInline(orderedListItem[3]),
      indent: Math.floor(orderedListItem[1].length / 2),
      kind: 'list-item',
      marker: `${orderedListItem[2]}.`,
    };
  }

  return { children: parseRecordMarkdownInline(line), kind: 'paragraph' };
}

export function parseRecordMarkdownInline(
  text: string
): RecordMarkdownInline[] {
  const nodes: RecordMarkdownInline[] = [];
  let index = 0;

  while (index < text.length) {
    const next = findNextInlineMarkup(text, index);

    if (!next) {
      nodes.push({ kind: 'text', text: text.slice(index) });
      break;
    }

    if (next.index > index) {
      nodes.push({ kind: 'text', text: text.slice(index, next.index) });
    }

    if (next.kind === 'link') {
      nodes.push({
        children: parseRecordMarkdownInline(next.label),
        href: next.href,
        kind: 'link',
      });

      index = next.endIndex;
      continue;
    }

    const contentStart = next.index + next.marker.length;
    const closeIndex = findClosingInlineToken(text, next.marker, contentStart);

    if (closeIndex === -1) {
      nodes.push({ kind: 'text', text: text.slice(next.index) });
      break;
    }

    nodes.push({
      children: parseRecordMarkdownInline(text.slice(contentStart, closeIndex)),
      kind: next.style,
    });

    index = closeIndex + next.marker.length;
  }

  return mergeAdjacentTextNodes(nodes);
}

function findNextInlineMarkup(text: string, start: number) {
  const link = findNextMarkdownLink(text, start);
  const token = findNextInlineToken(text, start);
  if (!link) return token;
  if (!token) return link;
  return link.index <= token.index ? link : token;
}

function findNextMarkdownLink(text: string, start: number) {
  let index = text.indexOf('[', start);

  while (index !== -1) {
    if (isEscaped(text, index) || text[index - 1] === '!') {
      index = text.indexOf('[', index + 1);
      continue;
    }

    const labelEnd = text.indexOf(']', index + 1);
    if (labelEnd === -1) return undefined;

    if (text[labelEnd + 1] !== '(') {
      index = text.indexOf('[', index + 1);
      continue;
    }

    const hrefEnd = text.indexOf(')', labelEnd + 2);
    if (hrefEnd === -1) return undefined;
    const label = text.slice(index + 1, labelEnd);
    const href = text.slice(labelEnd + 2, hrefEnd).trim();

    if (!label || !href) {
      index = text.indexOf('[', index + 1);
      continue;
    }

    return { endIndex: hrefEnd + 1, href, index, kind: 'link' as const, label };
  }
}

function findNextInlineToken(text: string, start: number) {
  let next:
    | {
        index: number;
        kind: 'style';
        marker: string;
        style: InlineToken['kind'];
      }
    | undefined;

  for (const token of INLINE_TOKENS) {
    let index = text.indexOf(token.marker, start);

    while (
      index !== -1 &&
      (isEscaped(text, index) ||
        isMarkerFollowedByWhitespace(text, index, token.marker) ||
        (token.marker.length === 1 &&
          isDoubleMarker(text, index, token.marker)))
    ) {
      index = text.indexOf(token.marker, index + token.marker.length);
    }

    if (index === -1) continue;

    if (
      !next ||
      index < next.index ||
      (index === next.index && token.marker.length > next.marker.length)
    ) {
      next = { index, kind: 'style', marker: token.marker, style: token.kind };
    }
  }

  return next;
}

function findClosingInlineToken(text: string, marker: string, start: number) {
  let index = text.indexOf(marker, start);

  while (index !== -1 && isEscaped(text, index)) {
    index = text.indexOf(marker, index + marker.length);
  }

  return index;
}

function isEscaped(text: string, index: number) {
  let slashCount = 0;

  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor--) {
    slashCount++;
  }

  return slashCount % 2 === 1;
}

function isDoubleMarker(text: string, index: number, marker: string) {
  return text[index - 1] === marker || text[index + 1] === marker;
}

function isMarkerFollowedByWhitespace(
  text: string,
  index: number,
  marker: string
) {
  return /\s/.test(text[index + marker.length] ?? '');
}

function mergeAdjacentTextNodes(nodes: RecordMarkdownInline[]) {
  return nodes.reduce<RecordMarkdownInline[]>((merged, node) => {
    const previous = merged[merged.length - 1];

    if (previous?.kind === 'text' && node.kind === 'text') {
      previous.text += node.text;
      return merged;
    }

    merged.push(node);
    return merged;
  }, []);
}
