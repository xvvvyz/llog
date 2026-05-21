type HtmlNode =
  | {
      attributes: Record<string, string>;
      children: HtmlNode[];
      tagName: string;
      type: 'element';
    }
  | { children: HtmlNode[]; type: 'root' }
  | { text: string; type: 'text' };

type HtmlElementNode = Extract<HtmlNode, { type: 'element' }>;

type RichTextPasteEditInput = {
  html: string;
  maxLength?: number;
  selectionEnd: number;
  selectionStart: number;
  text: string;
};

type RichTextPasteEdit = {
  selectionEnd: number;
  selectionStart: number;
  text: string;
};

type RenderContext = { insideLink?: boolean };
const UNORDERED_LIST_MARKER = '-';

const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
]);

const SKIP_TAGS = new Set(['head', 'meta', 'script', 'style', 'title']);

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

export function getRichTextPasteEdit({
  html,
  maxLength,
  selectionEnd,
  selectionStart,
  text,
}: RichTextPasteEditInput): RichTextPasteEdit | undefined {
  const markdown = richTextHtmlToMarkdown(html);
  if (!markdown) return;
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  const nextText = text.slice(0, start) + markdown + text.slice(end);
  if (typeof maxLength === 'number' && nextText.length > maxLength) return;
  const nextSelection = start + markdown.length;

  return {
    selectionEnd: nextSelection,
    selectionStart: nextSelection,
    text: nextText,
  };
}

export function richTextHtmlToMarkdown(html: string) {
  return normalizeMarkdown(renderChildren(parseHtml(html).children));
}

function parseHtml(html: string): Extract<HtmlNode, { type: 'root' }> {
  const root: Extract<HtmlNode, { type: 'root' }> = {
    children: [],
    type: 'root',
  };

  const stack: (HtmlElementNode | typeof root)[] = [root];
  let index = 0;

  while (index < html.length) {
    const tagStart = html.indexOf('<', index);

    if (tagStart === -1) {
      appendText(stack, html.slice(index));
      break;
    }

    if (tagStart > index) appendText(stack, html.slice(index, tagStart));

    if (html.startsWith('<!--', tagStart)) {
      const commentEnd = html.indexOf('-->', tagStart + 4);
      index = commentEnd === -1 ? html.length : commentEnd + 3;
      continue;
    }

    const tagEnd = html.indexOf('>', tagStart + 1);

    if (tagEnd === -1) {
      appendText(stack, html.slice(tagStart));
      break;
    }

    const rawTag = html.slice(tagStart, tagEnd + 1);
    index = tagEnd + 1;
    if (/^<\s*[!?]/.test(rawTag)) continue;
    const closingTag = /^<\s*\/\s*([a-zA-Z0-9:-]+)/.exec(rawTag);

    if (closingTag) {
      closeElement(stack, closingTag[1].toLowerCase());
      continue;
    }

    const openingTag = /^<\s*([a-zA-Z0-9:-]+)([\s\S]*?)\/?\s*>$/.exec(rawTag);

    if (!openingTag) {
      appendText(stack, rawTag);
      continue;
    }

    const tagName = openingTag[1].toLowerCase();

    const node: HtmlElementNode = {
      attributes: parseAttributes(openingTag[2]),
      children: [],
      tagName,
      type: 'element',
    };

    stack[stack.length - 1].children.push(node);
    if (!rawTag.endsWith('/>') && !VOID_TAGS.has(tagName)) stack.push(node);
  }

  return root;
}

function appendText(
  stack: (HtmlElementNode | Extract<HtmlNode, { type: 'root' }>)[],
  text: string
) {
  if (!text) return;

  stack[stack.length - 1].children.push({
    text: decodeHtmlEntities(text),
    type: 'text',
  });
}

function closeElement(
  stack: (HtmlElementNode | Extract<HtmlNode, { type: 'root' }>)[],
  tagName: string
) {
  for (let index = stack.length - 1; index > 0; index--) {
    const node = stack[index];
    if (node.type !== 'element' || node.tagName !== tagName) continue;
    stack.length = index;
    return;
  }
}

function parseAttributes(rawAttributes: string) {
  const attributes: Record<string, string> = {};

  const attributePattern =
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(rawAttributes))) {
    attributes[match[1].toLowerCase()] = decodeHtmlEntities(
      match[2] ?? match[3] ?? match[4] ?? ''
    );
  }

  return attributes;
}

function renderChildren(children: HtmlNode[], context: RenderContext = {}) {
  return children.map((child) => renderNode(child, context)).join('');
}

function renderNode(node: HtmlNode, context: RenderContext = {}): string {
  if (node.type === 'text') return normalizeText(node.text);
  if (node.type === 'root') return renderChildren(node.children, context);
  const tagName = node.tagName;
  if (SKIP_TAGS.has(tagName)) return '';
  if (tagName === 'br') return '\n';
  if (tagName === 'hr') return '\n---\n';
  if (tagName === 'img') return node.attributes.alt?.trim() ?? '';

  if (tagName === 'ul' || tagName === 'ol') {
    return block(renderList(node, tagName === 'ol', 0));
  }

  if (isHeadingElement(node)) {
    return block(wrapInline(renderInlineChildren(node, context).trim(), '**'));
  }

  if (tagName === 'blockquote') {
    const quote = normalizeMarkdown(renderChildren(node.children, context));
    if (!quote) return '';

    return block(
      quote
        .split('\n')
        .map((line) => (line ? `> ${line}` : '>'))
        .join('\n')
    );
  }

  if (BLOCK_TAGS.has(tagName)) {
    return block(renderInlineChildren(node, context));
  }

  if (hasBlockChild(node)) return renderChildren(node.children, context);
  return renderInlineElement(node, context);
}

function renderInlineChildren(node: HtmlElementNode, context: RenderContext) {
  return node.children
    .map((child) => renderInlineNode(child, context))
    .join('');
}

function renderInlineNode(node: HtmlNode, context: RenderContext): string {
  if (node.type === 'text') return normalizeText(node.text);
  if (node.type === 'root') return renderChildren(node.children, context);
  const tagName = node.tagName;
  if (SKIP_TAGS.has(tagName)) return '';
  if (tagName === 'br') return '\n';
  if (tagName === 'img') return node.attributes.alt?.trim() ?? '';

  if (tagName === 'ul' || tagName === 'ol') {
    return `\n${renderList(node, tagName === 'ol', 0)}\n`;
  }

  if (BLOCK_TAGS.has(tagName) || isHeadingElement(node)) {
    return `${renderNode(node, context).trim()}\n`;
  }

  return renderInlineElement(node, context);
}

function renderInlineElement(node: HtmlElementNode, context: RenderContext) {
  const childContext =
    node.tagName === 'a' ? { ...context, insideLink: true } : context;

  let text = renderInlineChildren(node, childContext);

  if (node.tagName === 'a') {
    const href = node.attributes.href?.trim();
    const label = text.trim();

    if (href && label) {
      text = `[${escapeLinkLabel(label)}](${escapeHref(href)})`;
    }
  }

  const style = getInlineStyle(node);

  if (
    ((node.tagName === 'b' || node.tagName === 'strong') &&
      !style.normalWeight) ||
    style.bold
  ) {
    text = wrapInline(text, '**');
  }

  if (node.tagName === 'i' || node.tagName === 'em' || style.italic) {
    text = wrapInline(text, '*');
  }

  if (
    node.tagName === 's' ||
    node.tagName === 'strike' ||
    node.tagName === 'del' ||
    style.strikethrough
  ) {
    text = wrapInline(text, '~~');
  }

  if (
    !context.insideLink &&
    node.tagName !== 'a' &&
    (node.tagName === 'u' || style.underline)
  ) {
    text = wrapInline(text, '<u>', '</u>');
  }

  return text;
}

function renderList(node: HtmlElementNode, ordered: boolean, depth: number) {
  const items = node.children.filter(
    (child): child is HtmlElementNode =>
      child.type === 'element' && child.tagName === 'li'
  );

  return items
    .map((item, index) => renderListItem(item, ordered, index, depth))
    .join('\n');
}

function renderListItem(
  node: HtmlElementNode,
  ordered: boolean,
  index: number,
  depth: number
) {
  const indent = '  '.repeat(depth);
  const marker = ordered ? `${index + 1}.` : UNORDERED_LIST_MARKER;
  const nestedLists: string[] = [];

  const content = normalizeMarkdown(
    node.children
      .map((child) => {
        if (
          child.type === 'element' &&
          (child.tagName === 'ul' || child.tagName === 'ol')
        ) {
          nestedLists.push(
            renderList(child, child.tagName === 'ol', depth + 1)
          );

          return '';
        }

        return renderInlineNode(child, {});
      })
      .join('')
  );

  const contentLines = content ? content.split('\n') : [''];

  const lines = [
    `${indent}${marker} ${contentLines[0] ?? ''}`.trimEnd(),
    ...contentLines.slice(1).map((line) => `${indent}  ${line}`.trimEnd()),
    ...nestedLists,
  ];

  return lines.filter(Boolean).join('\n');
}

function block(text: string) {
  const trimmed = normalizeMarkdown(text);
  return trimmed ? `${trimmed}\n\n` : '';
}

function hasBlockChild(node: HtmlElementNode) {
  return node.children.some(
    (child) =>
      child.type === 'element' &&
      (BLOCK_TAGS.has(child.tagName) ||
        child.tagName === 'ol' ||
        child.tagName === 'ul' ||
        isHeadingElement(child))
  );
}

function isHeadingElement(node: HtmlElementNode) {
  if (/^h[1-6]$/.test(node.tagName)) return true;
  if (node.attributes.role !== 'heading') return false;
  const ariaLevel = Number(node.attributes['aria-level']);
  return Number.isInteger(ariaLevel) && ariaLevel >= 1 && ariaLevel <= 6;
}

function getInlineStyle(node: HtmlElementNode) {
  const style = node.attributes.style?.toLowerCase() ?? '';
  const fontWeight = /font-weight\s*:\s*([^;]+)/.exec(style)?.[1]?.trim();
  const numericFontWeight = fontWeight ? Number(fontWeight) : Number.NaN;

  const textDecoration = /text-decoration(?:-line)?\s*:\s*([^;]+)/
    .exec(style)?.[1]
    ?.trim();

  return {
    bold:
      fontWeight === 'bold' ||
      fontWeight === 'bolder' ||
      numericFontWeight >= 600,
    italic: /font-style\s*:\s*italic\b/.test(style),
    normalWeight:
      fontWeight === 'normal' ||
      fontWeight === 'lighter' ||
      (Number.isFinite(numericFontWeight) && numericFontWeight < 600),
    strikethrough: textDecoration?.includes('line-through') ?? false,
    underline: textDecoration?.includes('underline') ?? false,
  };
}

function wrapInline(text: string, marker: string, closeMarker = marker) {
  const leadingWhitespace = /^\s*/.exec(text)?.[0] ?? '';
  const trailingWhitespace = /\s*$/.exec(text)?.[0] ?? '';

  const content = text.slice(
    leadingWhitespace.length,
    text.length - trailingWhitespace.length
  );

  if (!content) return text;
  return `${leadingWhitespace}${marker}${content}${closeMarker}${trailingWhitespace}`;
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n');
}

function normalizeMarkdown(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeLinkLabel(label: string) {
  return label.replace(/([\\[\]])/g, '\\$1');
}

function escapeHref(href: string) {
  return href.replace(/\)/g, '%29');
}

function decodeHtmlEntities(text: string) {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (entity, name) => {
    if (name[0] !== '#') return ENTITY_MAP[name.toLowerCase()] ?? entity;
    const isHex = name[1]?.toLowerCase() === 'x';
    const value = Number.parseInt(name.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    return Number.isFinite(value) ? String.fromCodePoint(value) : entity;
  });
}
