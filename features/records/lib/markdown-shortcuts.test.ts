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

const getShortcut = (
  event: Partial<
    Parameters<typeof markdownShortcuts.getMarkdownShortcutFromKeyEvent>[0]
  >,
  usesMetaKey = false
) =>
  markdownShortcuts.getMarkdownShortcutFromKeyEvent(keyEvent(event), {
    usesMetaKey,
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

  test('unwraps bold selection', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 11,
        selectionStart: 7,
        shortcut: 'bold',
        text: 'make **this** bold',
      })
    ).toEqual({ selectionEnd: 9, selectionStart: 5, text: 'make this bold' });
  });

  test('unwraps containing bold', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 9,
        selectionStart: 9,
        shortcut: 'bold',
        text: 'make **this** bold',
      })
    ).toEqual({ selectionEnd: 7, selectionStart: 7, text: 'make this bold' });
  });

  test('wraps cursor word', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 7,
        selectionStart: 7,
        shortcut: 'bold',
        text: 'make this bold',
      })
    ).toEqual({
      selectionEnd: 11,
      selectionStart: 7,
      text: 'make **this** bold',
    });
  });

  test('wraps selected list item content', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 5,
        selectionStart: 0,
        shortcut: 'bold',
        text: '- one',
      })
    ).toEqual({ selectionEnd: 7, selectionStart: 4, text: '- **one**' });
  });

  test('unwraps selected list item content', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 9,
        selectionStart: 0,
        shortcut: 'bold',
        text: '- **one**',
      })
    ).toEqual({ selectionEnd: 5, selectionStart: 2, text: '- one' });
  });

  test('wraps selected list item lines', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 11,
        selectionStart: 0,
        shortcut: 'bold',
        text: '- one\n- two',
      }).text
    ).toBe('- **one**\n- **two**');
  });

  test('keeps selected range', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 8,
        selectionStart: 6,
        shortcut: 'bold',
        text: 'make this bold',
      })
    ).toEqual({
      selectionEnd: 10,
      selectionStart: 8,
      text: 'make t**hi**s bold',
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

  test('wraps strikethrough selection', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 9,
        selectionStart: 5,
        shortcut: 'strikethrough',
        text: 'make this gone',
      })
    ).toEqual({
      selectionEnd: 11,
      selectionStart: 7,
      text: 'make ~~this~~ gone',
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

  test('unwraps link selection', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 5,
        selectionStart: 1,
        shortcut: 'link',
        text: '[docs](url)',
      })
    ).toEqual({ selectionEnd: 4, selectionStart: 0, text: 'docs' });
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

  test('unprefixes bullet lines', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 11,
        selectionStart: 0,
        shortcut: 'unordered-list',
        text: '- one\n- two',
      })
    ).toEqual({ selectionEnd: 7, selectionStart: 0, text: 'one\ntwo' });
  });

  test('converts ordered to bullets', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 6,
        selectionStart: 6,
        shortcut: 'unordered-list',
        text: '1. one',
      })
    ).toEqual({ selectionEnd: 5, selectionStart: 5, text: '- one' });
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

  test('converts bullets to ordered', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 5,
        selectionStart: 5,
        shortcut: 'ordered-list',
        text: '- one',
      })
    ).toEqual({ selectionEnd: 6, selectionStart: 6, text: '1. one' });
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

  test('prefixes quote lines', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 7,
        selectionStart: 0,
        shortcut: 'blockquote',
        text: 'one\ntwo',
      })
    ).toEqual({ selectionEnd: 11, selectionStart: 2, text: '> one\n> two' });
  });

  test('unprefixes quote lines', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 11,
        selectionStart: 0,
        shortcut: 'blockquote',
        text: '> one\n> two',
      })
    ).toEqual({ selectionEnd: 7, selectionStart: 0, text: 'one\ntwo' });
  });

  test('inserts quote placeholder', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 4,
        selectionStart: 4,
        shortcut: 'blockquote',
        text: 'one\n',
      })
    ).toEqual({
      selectionEnd: 16,
      selectionStart: 6,
      text: 'one\n> blockquote',
    });
  });

  test('inserts divider block', () => {
    expect(
      markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: 4,
        selectionStart: 4,
        shortcut: 'horizontal-rule',
        text: 'one\ntwo',
      })
    ).toEqual({ selectionEnd: 7, selectionStart: 7, text: 'one\n---\ntwo' });
  });
});

describe('getMarkdownTabEdit', () => {
  test('indents list item', () => {
    expect(
      markdownShortcuts.getMarkdownTabEdit({
        selectionEnd: 5,
        selectionStart: 5,
        text: '- one',
      })
    ).toEqual({ selectionEnd: 7, selectionStart: 7, text: '  - one' });
  });

  test('outdents list item', () => {
    expect(
      markdownShortcuts.getMarkdownTabEdit({
        selectionEnd: 7,
        selectionStart: 7,
        shiftKey: true,
        text: '  - one',
      })
    ).toEqual({ selectionEnd: 5, selectionStart: 5, text: '- one' });
  });

  test('selects link target', () => {
    expect(
      markdownShortcuts.getMarkdownTabEdit({
        selectionEnd: 5,
        selectionStart: 1,
        text: '[text](url)',
      })
    ).toEqual({ selectionEnd: 10, selectionStart: 7, text: '[text](url)' });
  });

  test('moves after link target', () => {
    expect(
      markdownShortcuts.getMarkdownTabEdit({
        selectionEnd: 10,
        selectionStart: 7,
        text: '[text](url)',
      })
    ).toEqual({ selectionEnd: 11, selectionStart: 11, text: '[text](url)' });
  });

  test('ignores plain lines', () => {
    expect(
      markdownShortcuts.getMarkdownTabEdit({
        selectionEnd: 3,
        selectionStart: 3,
        text: 'one',
      })
    ).toBeUndefined();
  });
});

describe('getMarkdownEnterEdit', () => {
  test('moves after link target', () => {
    expect(
      markdownShortcuts.getMarkdownEnterEdit({
        selectionEnd: 10,
        selectionStart: 7,
        text: '[text](url)',
      })
    ).toEqual({ selectionEnd: 11, selectionStart: 11, text: '[text](url)' });
  });
});

describe('getMarkdownShortcutFromKeyEvent', () => {
  test('maps text styles', () => {
    expect(getShortcut({ key: 'b', metaKey: true }, true)).toBe('bold');
    expect(getShortcut({ ctrlKey: true, key: 'I' })).toBe('italic');
    expect(getShortcut({ ctrlKey: true, key: 'k' })).toBe('link');
    expect(getShortcut({ ctrlKey: true, key: 'u' })).toBe('underline');
  });

  test('maps lists', () => {
    expect(
      getShortcut({ code: 'Digit7', ctrlKey: true, key: '&', shiftKey: true })
    ).toBe('ordered-list');

    expect(
      getShortcut(
        { code: 'Digit8', key: '*', metaKey: true, shiftKey: true },
        true
      )
    ).toBe('unordered-list');
  });

  test('uses platform modifier', () => {
    expect(getShortcut({ ctrlKey: true, key: 'b' }, true)).toBeNull();
    expect(getShortcut({ key: 'b', metaKey: true })).toBeNull();
  });

  test('ignores plain keys', () => {
    expect(getShortcut({ key: 'b' })).toBeNull();
  });

  test('ignores modified input', () => {
    expect(getShortcut({ altKey: true, ctrlKey: true, key: 'b' })).toBeNull();

    expect(
      getShortcut({
        ctrlKey: true,
        key: 'b',
        nativeEvent: { isComposing: true },
      })
    ).toBeNull();
  });
});
