import { cn } from '@/lib/cn';
import { Text } from '@/ui/text';
import LinkifyIt from 'linkify-it';
import * as React from 'react';
import { Linking, Platform } from 'react-native';
import tlds from 'tlds';
import * as recordMarkdown from '@/features/records/lib/record-markdown';

const linkify = new LinkifyIt().tlds(tlds);
const LIST_INDENT_CH = 2;
const SHORT_LIST_MARKER_COLUMN_CH = 2.25;
const LONG_LIST_MARKER_COLUMN_CH = 3.25;

export function renderRecordMarkdownText({
  color,
  flattenListItems = false,
  text,
}: {
  color?: string;
  flattenListItems?: boolean;
  text: string;
}) {
  return recordMarkdown
    .parseRecordMarkdown(text)
    .flatMap((block, index, blocks) => [
      renderBlock(block, index, color, flattenListItems),
      getBlockSeparator(block, index, blocks, flattenListItems),
    ]);
}

function renderBlock(
  block: recordMarkdown.RecordMarkdownBlock,
  index: number,
  color?: string,
  flattenListItems = false
) {
  if (block.kind === 'list-item') {
    const indent = block.indent;
    const marker = block.marker;

    if (flattenListItems) {
      return (
        <React.Fragment key={`block:${index}`}>
          {'  '.repeat(indent)}
          <Text className={getListMarkerClassName(marker)}>{marker} </Text>
          {renderInlines(block.children, `${index}`, color)}
        </React.Fragment>
      );
    }

    return (
      <Text key={`block:${index}`} style={getListItemStyle({ indent, marker })}>
        {renderNativeListIndent({ indent })}
        {renderListMarker({ indent, marker })}
        {renderInlines(block.children, `${index}`, color)}
      </Text>
    );
  }

  const className = cn(block.kind === 'title' && 'font-bold');
  const content = renderInlines(block.children, `${index}`, color);
  if (!className) return content;

  return (
    <Text key={`block:${index}`} className={className}>
      {content}
    </Text>
  );
}

function getBlockSeparator(
  block: recordMarkdown.RecordMarkdownBlock,
  index: number,
  blocks: recordMarkdown.RecordMarkdownBlock[],
  flattenListItems = false
) {
  if (index >= blocks.length - 1) return null;
  if (flattenListItems) return '\n';
  if (Platform.OS === 'web' && block.kind === 'list-item') return null;
  return '\n';
}

function getListItemStyle({
  indent,
  marker,
}: {
  indent: number;
  marker: string;
}) {
  if (Platform.OS !== 'web') return undefined;
  const indentWidth = getListIndentWidth(indent);
  const markerColumnWidth = getListMarkerColumnWidth(marker);

  return {
    display: 'block',
    marginBottom: 0,
    marginTop: 0,
    position: 'relative',
    paddingLeft: `${indentWidth + markerColumnWidth}ch`,
  } as unknown as React.ComponentProps<typeof Text>['style'];
}

function getListIndentWidth(indent: number) {
  return indent * LIST_INDENT_CH;
}

function getListMarkerColumnWidth(marker: string) {
  return marker.length <= 2
    ? SHORT_LIST_MARKER_COLUMN_CH
    : LONG_LIST_MARKER_COLUMN_CH;
}

function renderNativeListIndent({ indent }: { indent: number }) {
  if (Platform.OS === 'web' || indent <= 0) return null;
  return '  '.repeat(indent);
}

function renderListMarker({
  indent,
  marker,
}: {
  indent: number;
  marker: string;
}) {
  const className = getListMarkerClassName(marker);

  if (Platform.OS !== 'web') {
    return (
      <Text key="marker" className={className}>
        {marker}{' '}
      </Text>
    );
  }

  return (
    <Text
      key="marker"
      className={className}
      style={
        {
          left: `${getListIndentWidth(indent)}ch`,
          lineHeight: 'inherit',
          position: 'absolute',
          textAlign: 'left',
          width: `${getListMarkerColumnWidth(marker)}ch`,
        } as unknown as React.ComponentProps<typeof Text>['style']
      }
    >
      {marker}
    </Text>
  );
}

function getListMarkerClassName(marker: string) {
  return cn('text-muted-foreground', marker !== '-' && 'tabular-nums');
}

function renderInlines(
  inlines: recordMarkdown.RecordMarkdownInline[],
  keyPrefix: string,
  color?: string,
  shouldLinkifyText = true
): React.ReactNode[] {
  return inlines.map((inline, index) => {
    const key = `${keyPrefix}:${index}`;

    if (inline.kind === 'text') {
      if (!shouldLinkifyText) return inline.text;
      return renderLinkifiedText({ color, keyPrefix: key, text: inline.text });
    }

    if (inline.kind === 'link') {
      return renderMarkdownLink({
        children: renderInlines(inline.children, key, color, false),
        color,
        href: inline.href,
        linkText: getPlainInlineText(inline.children),
        reactKey: key,
      });
    }

    return (
      <Text key={key} className={getInlineClassName(inline.kind)}>
        {renderInlines(inline.children, key, color, shouldLinkifyText)}
      </Text>
    );
  });
}

function getInlineClassName(kind: recordMarkdown.RecordMarkdownInline['kind']) {
  if (kind === 'bold') return 'font-bold';
  if (kind === 'italic') return 'italic';
  if (kind === 'strikethrough') return 'line-through';
  if (kind === 'underline') return 'underline';
}

function renderMarkdownLink({
  children,
  color,
  href,
  linkText,
  reactKey,
}: {
  children: React.ReactNode;
  color?: string;
  href: string;
  linkText: string;
  reactKey: string;
}) {
  const url = normalizeMarkdownLinkHref(href);
  if (!url) return `[${linkText}](${href})`;
  return renderLink({ children, color, reactKey, url });
}

function normalizeMarkdownLinkHref(href: string) {
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  const match = linkify.match(href)?.[0];

  if (match?.text === href) {
    return match.schema
      ? match.url
      : match.url.replace(/^http:\/\//, 'https://');
  }
}

function getPlainInlineText(
  inlines: recordMarkdown.RecordMarkdownInline[]
): string {
  return inlines
    .map((inline) => {
      if (inline.kind === 'text') return inline.text;
      return getPlainInlineText(inline.children);
    })
    .join('');
}

function renderLinkifiedText({
  color,
  keyPrefix,
  text,
}: {
  color?: string;
  keyPrefix: string;
  text: string;
}) {
  const matches = linkify.match(text);
  if (!matches?.length) return text;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    const index = match.index;
    if (index > lastIndex) parts.push(text.slice(lastIndex, index));

    const url = match.schema
      ? match.url
      : match.url.replace(/^http:\/\//, 'https://');

    parts.push(
      renderLink({
        children: match.text,
        color,
        reactKey: `${keyPrefix}:${url}:${index}`,
        url,
      })
    );

    lastIndex = match.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : text;
}

function renderLink({
  children,
  color,
  reactKey,
  url,
}: {
  children: React.ReactNode;
  color?: string;
  reactKey: string;
  url: string;
}) {
  const linkStyle = color ? { color } : undefined;

  if (Platform.OS === 'web') {
    const isExternal = /^(https?:)?\/\//i.test(url);

    return (
      <Text
        key={reactKey}
        asChild
        className={cn('underline', !color && 'text-primary')}
        style={linkStyle}
      >
        <a
          href={url}
          rel={isExternal ? 'noreferrer noopener' : undefined}
          target={isExternal ? '_blank' : undefined}
        >
          {children}
        </a>
      </Text>
    );
  }

  return (
    <Text
      key={reactKey}
      className={cn('underline', !color && 'text-primary')}
      onPress={() => Linking.openURL(url)}
      style={linkStyle}
    >
      {children}
    </Text>
  );
}
