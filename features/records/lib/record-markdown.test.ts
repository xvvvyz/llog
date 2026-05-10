import { parseRecordMarkdown } from '@/features/records/lib/record-markdown';
import { describe, expect, test } from 'bun:test';

describe('parseRecordMarkdown', () => {
  test('parses titles as bold-only title blocks', () => {
    expect(parseRecordMarkdown('# Title')[0]).toEqual({
      children: [{ kind: 'text', text: 'Title' }],
      kind: 'title',
    });
  });

  test('parses supported inline styles', () => {
    expect(
      parseRecordMarkdown(
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

  test('parses unordered and ordered list items with inline content', () => {
    expect(
      parseRecordMarkdown('- **one**\n  2. [two](https://two.test)')
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
      parseRecordMarkdown('Read [the docs](https://example.com).')[0]
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

  test('skips escaped inline markers and parses later matching spans', () => {
    expect(parseRecordMarkdown('\\*literal* then *italic*')[0]).toEqual({
      children: [
        { kind: 'text', text: '\\*literal* then ' },
        { children: [{ kind: 'text', text: 'italic' }], kind: 'italic' },
      ],
      kind: 'paragraph',
    });
  });

  test('skips escaped closing inline markers', () => {
    expect(parseRecordMarkdown('*a \\* literal*')[0]).toEqual({
      children: [
        { children: [{ kind: 'text', text: 'a \\* literal' }], kind: 'italic' },
      ],
      kind: 'paragraph',
    });
  });

  test('leaves unsupported markdown syntax as text', () => {
    expect(
      parseRecordMarkdown('![alt](image.jpg)\n---\n| a | b |\n<div>html</div>')
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
