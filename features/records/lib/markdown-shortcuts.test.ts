import { describe, expect, test } from 'bun:test';
import { getMarkdownShortcutEdit } from '@/features/records/lib/markdown-shortcuts';

describe('getMarkdownShortcutEdit', () => {
  test('wraps bold selection', () => {
    expect(
      getMarkdownShortcutEdit({
        selectionEnd: 9,
        selectionStart: 5,
        shortcut: 'bold',
        text: 'make this bold',
      })
    ).toEqual({
      selectionEnd: 11,
      selectionStart: 7,
      text: 'make **this** bold',
    });
  });

  test('inserts italic placeholder', () => {
    expect(
      getMarkdownShortcutEdit({
        selectionEnd: 0,
        selectionStart: 0,
        shortcut: 'italic',
        text: '',
      })
    ).toEqual({ selectionEnd: 7, selectionStart: 1, text: '*italic*' });
  });

  test('wraps link selection', () => {
    expect(
      getMarkdownShortcutEdit({
        selectionEnd: 4,
        selectionStart: 0,
        shortcut: 'link',
        text: 'docs',
      })
    ).toEqual({ selectionEnd: 10, selectionStart: 7, text: '[docs](url)' });
  });

  test('inserts link placeholder', () => {
    expect(
      getMarkdownShortcutEdit({
        selectionEnd: 0,
        selectionStart: 0,
        shortcut: 'link',
        text: '',
      })
    ).toEqual({ selectionEnd: 5, selectionStart: 1, text: '[text](url)' });
  });

  test('prefixes unordered list lines', () => {
    expect(
      getMarkdownShortcutEdit({
        selectionEnd: 7,
        selectionStart: 0,
        shortcut: 'unordered-list',
        text: 'one\ntwo',
      })
    ).toEqual({ selectionEnd: 11, selectionStart: 2, text: '- one\n- two' });
  });

  test('prefixes ordered list lines', () => {
    expect(
      getMarkdownShortcutEdit({
        selectionEnd: 12,
        selectionStart: 5,
        shortcut: 'ordered-list',
        text: 'skip\none\ntwo\nskip',
      })
    ).toEqual({
      selectionEnd: 18,
      selectionStart: 8,
      text: 'skip\n1. one\n2. two\nskip',
    });
  });
});
