import { describe, expect, test } from 'bun:test';
import { getMarkdownListEnterEdit } from '@/ui/textarea-markdown-lists';

describe('getMarkdownListEnterEdit', () => {
  test('continues supported unordered list markers', () => {
    for (const marker of ['-', '+', '*']) {
      expectEnter(`${marker} one|`, `${marker} one\n${marker} |`);
    }
  });

  test('preserves indentation when continuing a list', () => {
    expectEnter('  - one|', '  - one\n  - |');
  });

  test('increments ordered dot list markers', () => {
    expectEnter('1. one|', '1. one\n2. |');
  });

  test('increments ordered parenthesis list markers', () => {
    expectEnter('7) one|', '7) one\n8) |');
  });

  test('removes empty unordered list markers', () => {
    expectEnter('- one\n- |', '- one\n|');
  });

  test('removes empty ordered list markers', () => {
    expectEnter('1. one\n2. |', '1. one\n|');
  });

  test('leaves unsupported marker formats alone', () => {
    expect(getEdit('1000. one|')).toBeUndefined();
    expect(getEdit('999. one|')).toBeUndefined();
  });

  test('leaves non-list lines alone', () => {
    expect(getEdit('# one|')).toBeUndefined();
  });
});

function expectEnter(input: string, expected: string) {
  expect(serializeEdit(input)).toBe(expected);
}

function serializeEdit(input: string) {
  const { selectionStart, text } = parseCursor(input);

  const edit = getMarkdownListEnterEdit({
    selectionEnd: selectionStart,
    selectionStart,
    text,
  });

  if (!edit) return;

  return `${edit.text.slice(0, edit.selectionStart)}|${edit.text.slice(
    edit.selectionEnd
  )}`;
}

function getEdit(input: string) {
  const { selectionStart, text } = parseCursor(input);

  return getMarkdownListEnterEdit({
    selectionEnd: selectionStart,
    selectionStart,
    text,
  });
}

function parseCursor(input: string) {
  const selectionStart = input.indexOf('|');
  if (selectionStart === -1) throw new Error('Missing cursor marker');

  return {
    selectionStart,
    text: input.slice(0, selectionStart) + input.slice(selectionStart + 1),
  };
}
