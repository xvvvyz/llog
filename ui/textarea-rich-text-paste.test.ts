import { describe, expect, test } from 'bun:test';
import * as textareaRichTextPaste from '@/ui/textarea-rich-text-paste';

describe('richTextHtmlToMarkdown', () => {
  test('converts inline styles', () => {
    expect(
      textareaRichTextPaste.richTextHtmlToMarkdown(
        '<p>Hello <strong>bold</strong>, <em>italic</em>, <u>under</u>, <s>gone</s>, <a href="https://example.com">docs</a>.</p>'
      )
    ).toBe(
      'Hello **bold**, *italic*, <u>under</u>, ~~gone~~, [docs](https://example.com).'
    );
  });

  test('converts blocks', () => {
    expect(
      textareaRichTextPaste.richTextHtmlToMarkdown(
        '<h2>Plan</h2><p>First</p><p>Second</p>'
      )
    ).toBe('**Plan**\n\nFirst\n\nSecond');
  });

  test('converts lists', () => {
    expect(
      textareaRichTextPaste.richTextHtmlToMarkdown(
        '<ol><li>One</li><li>Two<ul><li>Nested</li></ul></li></ol>'
      )
    ).toBe('1. One\n2. Two\n  - Nested');
  });

  test('keeps linked text lines', () => {
    expect(
      textareaRichTextPaste.richTextHtmlToMarkdown(
        '<a href="https://example.com?t=0">0:00</a> The business creation spike\n<a href="https://example.com?t=194">3:14</a> Are vibe-coded businesses legit?'
      )
    ).toBe(
      '[0:00](https://example.com?t=0) The business creation spike\n[3:14](https://example.com?t=194) Are vibe-coded businesses legit?'
    );
  });

  test('unwraps document html', () => {
    expect(
      textareaRichTextPaste.richTextHtmlToMarkdown(
        '<b style="font-weight: normal"><h2><span>Plan</span></h2><p><a href="https://example.com"><span style="text-decoration: underline">Docs</span></a></p></b>'
      )
    ).toBe('**Plan**\n\n[Docs](https://example.com)');
  });

  test('converts aria headings', () => {
    expect(
      textareaRichTextPaste.richTextHtmlToMarkdown(
        '<div role="heading" aria-level="3">Plan</div>'
      )
    ).toBe('**Plan**');
  });

  test('converts blockquotes', () => {
    expect(
      textareaRichTextPaste.richTextHtmlToMarkdown(
        '<blockquote><p>One</p><p><strong>Two</strong></p></blockquote>'
      )
    ).toBe('> One\n>\n> **Two**');
  });

  test('reads style attributes', () => {
    expect(
      textareaRichTextPaste.richTextHtmlToMarkdown(
        '<span style="font-weight: 700; font-style: italic; text-decoration: underline line-through">Styled</span>'
      )
    ).toBe('<u>~~***Styled***~~</u>');
  });
});

describe('getRichTextPasteEdit', () => {
  test('inserts markdown', () => {
    expect(
      textareaRichTextPaste.getRichTextPasteEdit({
        html: '<strong>there</strong>',
        selectionEnd: 5,
        selectionStart: 5,
        text: 'hello',
      })
    ).toEqual({ selectionEnd: 14, selectionStart: 14, text: 'hello**there**' });
  });

  test('replaces selection', () => {
    expect(
      textareaRichTextPaste.getRichTextPasteEdit({
        html: '<a href="https://example.com">link</a>',
        selectionEnd: 7,
        selectionStart: 2,
        text: 'replace',
      })
    ).toEqual({
      selectionEnd: 29,
      selectionStart: 29,
      text: 're[link](https://example.com)',
    });
  });

  test('respects max length', () => {
    expect(
      textareaRichTextPaste.getRichTextPasteEdit({
        html: '<strong>too long</strong>',
        maxLength: 5,
        selectionEnd: 0,
        selectionStart: 0,
        text: '',
      })
    ).toBeUndefined();
  });
});
