import { describe, expect, test } from 'bun:test';
import * as recordMarkdown from '@/domain/records/markdown';

describe('parseRecordMarkdown', () => {
  test('parses headings', () => {
    expect(recordMarkdown.parseRecordMarkdown('# Title')[0]).toEqual({
      children: [{ kind: 'text', text: 'Title' }],
      kind: 'title',
    });
  });

  test('parses inline styles', () => {
    expect(
      recordMarkdown.parseRecordMarkdown(
        '**bold** ~~strike~~ ++underline++ *italic* _also italic_'
      )[0]
    ).toMatchObject({
      children: [
        { children: [{ kind: 'text', text: 'bold' }], kind: 'bold' },
        { kind: 'text', text: ' ' },
        { children: [{ kind: 'text', text: 'strike' }], kind: 'strikethrough' },
        { kind: 'text', text: ' ' },
        { children: [{ kind: 'text', text: 'underline' }], kind: 'underline' },
        { kind: 'text', text: ' ' },
        { children: [{ kind: 'text', text: 'italic' }], kind: 'italic' },
        { kind: 'text', text: ' ' },
        { children: [{ kind: 'text', text: 'also italic' }], kind: 'italic' },
      ],
      kind: 'paragraph',
    });
  });

  test('parses lists', () => {
    expect(
      recordMarkdown.parseRecordMarkdown(
        '- **one**\n  2. [two](https://two.test)'
      )
    ).toEqual([
      {
        children: [{ children: [{ kind: 'text', text: 'one' }], kind: 'bold' }],
        indent: 0,
        kind: 'list-item',
        marker: '-',
      },
      {
        children: [
          {
            children: [{ kind: 'text', text: 'two' }],
            href: 'https://two.test',
            kind: 'link',
          },
        ],
        indent: 1,
        kind: 'list-item',
        marker: '2.',
      },
    ]);
  });

  test('parses markdown links', () => {
    expect(
      recordMarkdown.parseRecordMarkdown(
        'Read [the docs](https://example.com).'
      )[0]
    ).toEqual({
      children: [
        { kind: 'text', text: 'Read ' },
        {
          children: [{ kind: 'text', text: 'the docs' }],
          href: 'https://example.com',
          kind: 'link',
        },
        { kind: 'text', text: '.' },
      ],
      kind: 'paragraph',
    });
  });

  test('skips escaped openers', () => {
    expect(
      recordMarkdown.parseRecordMarkdown('\\*literal* then *italic*')[0]
    ).toEqual({
      children: [
        { kind: 'text', text: '\\*literal* then ' },
        { children: [{ kind: 'text', text: 'italic' }], kind: 'italic' },
      ],
      kind: 'paragraph',
    });
  });

  test('skips escaped closers', () => {
    expect(recordMarkdown.parseRecordMarkdown('*a \\* literal*')[0]).toEqual({
      children: [
        { children: [{ kind: 'text', text: 'a \\* literal' }], kind: 'italic' },
      ],
      kind: 'paragraph',
    });
  });

  test('keeps unsupported syntax', () => {
    expect(
      recordMarkdown.parseRecordMarkdown(
        '![alt](image.jpg)\n---\n| a | b |\n<div>html</div>'
      )
    ).toEqual([
      {
        children: [{ kind: 'text', text: '![alt](image.jpg)' }],
        kind: 'paragraph',
      },
      { children: [{ kind: 'text', text: '---' }], kind: 'paragraph' },
      { children: [{ kind: 'text', text: '| a | b |' }], kind: 'paragraph' },
      {
        children: [{ kind: 'text', text: '<div>html</div>' }],
        kind: 'paragraph',
      },
    ]);
  });
});

describe('recordMarkdownToPlainText', () => {
  test('strips markdown', () => {
    expect(
      recordMarkdown.recordMarkdownToPlainText(
        '# Title\n- **bold** and *italic*\n  2. [docs](https://example.com)'
      )
    ).toBe('Title bold and italic docs');
  });

  test('keeps plain text', () => {
    expect(recordMarkdown.recordMarkdownToPlainText('  one\n\n  two  ')).toBe(
      'one two'
    );
  });
});
