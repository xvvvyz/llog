import { describe, expect, test } from 'bun:test';
import * as markdownShortcuts from '@/features/records/lib/markdown-shortcuts';

const keyEvent = (
  event: Partial<
    Parameters<typeof markdownShortcuts.getMarkdownShortcutFromKeyEvent>[0]
  >
): Parameters<typeof markdownShortcuts.getMarkdownShortcutFromKeyEvent>[0] => ({
  key: '',
  ...event,
});

describe('getMarkdownShortcutEdit', () => {
  test('wraps bold selection', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
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
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 0,
        selectionStart: 0,
        shortcut: 'italic',
        text: '',
      })
    ).toEqual({ selectionEnd: 7, selectionStart: 1, text: '*italic*' });
  });

  test('wraps underline selection', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 9,
        selectionStart: 5,
        shortcut: 'underline',
        text: 'make this underlined',
      })
    ).toEqual({
      selectionEnd: 12,
      selectionStart: 8,
      text: 'make <u>this</u> underlined',
    });
  });

  test('wraps link selection', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 4,
        selectionStart: 0,
        shortcut: 'link',
        text: 'docs',
      })
    ).toEqual({ selectionEnd: 10, selectionStart: 7, text: '[docs](url)' });
  });

  test('inserts link placeholder', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 0,
        selectionStart: 0,
        shortcut: 'link',
        text: '',
      })
    ).toEqual({ selectionEnd: 5, selectionStart: 1, text: '[text](url)' });
  });

  test('prefixes bullet lines', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 7,
        selectionStart: 0,
        shortcut: 'unordered-list',
        text: 'one\ntwo',
      })
    ).toEqual({ selectionEnd: 11, selectionStart: 2, text: '- one\n- two' });
  });

  test('prefixes ordered list lines', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
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

  test('starts lists on blanks', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 5,
        selectionStart: 5,
        shortcut: 'unordered-list',
        text: 'one\n\n',
      })
    ).toEqual({ selectionEnd: 7, selectionStart: 7, text: 'one\n\n- ' });

    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 5,
        selectionStart: 5,
        shortcut: 'ordered-list',
        text: 'one\n\n',
      })
    ).toEqual({ selectionEnd: 8, selectionStart: 8, text: 'one\n\n1. ' });
  });
});

describe('getMarkdownShortcutFromKeyEvent', () => {
  test('maps text styles', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutFromKeyEvent(
        keyEvent({ key: 'b', metaKey: true })
      )
    ).toBe('bold');

    expect(
      markdownShortcuts.getMarkdownShortcutFromKeyEvent(
        keyEvent({ ctrlKey: true, key: 'I' })
      )
    ).toBe('italic');

    expect(
      markdownShortcuts.getMarkdownShortcutFromKeyEvent(
        keyEvent({ ctrlKey: true, key: 'k' })
      )
    ).toBe('link');
  });

  test('maps lists', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutFromKeyEvent(
        keyEvent({ code: 'Digit7', ctrlKey: true, key: '&', shiftKey: true })
      )
    ).toBe('ordered-list');

    expect(
      markdownShortcuts.getMarkdownShortcutFromKeyEvent(
        keyEvent({ code: 'Digit8', metaKey: true, key: '*', shiftKey: true })
      )
    ).toBe('unordered-list');
  });

  test('ignores plain keys', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutFromKeyEvent(keyEvent({ key: 'b' }))
    ).toBeNull();
  });

  test('ignores modified input', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutFromKeyEvent(
        keyEvent({ altKey: true, ctrlKey: true, key: 'b' })
      )
    ).toBeNull();

    expect(
      markdownShortcuts.getMarkdownShortcutFromKeyEvent(
        keyEvent({
          ctrlKey: true,
          key: 'b',
          nativeEvent: { isComposing: true },
        })
      )
    ).toBeNull();
  });
});
