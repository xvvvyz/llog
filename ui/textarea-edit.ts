export type TextareaTextEdit = {
  selectionEnd: number;
  selectionStart: number;
  text: string;
};

export function applyTextareaEditWithUndo(
  textarea: HTMLTextAreaElement,
  edit: TextareaTextEdit
) {
  if (textarea.value === edit.text) {
    textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    return true;
  }

  const replacement = getTextareaReplacement(textarea.value, edit.text);
  if (!replacement) return false;
  focusTextarea(textarea);
  textarea.setSelectionRange(replacement.start, replacement.end);
  let applied = false;
  if (!shouldSkipUndoCommand()) applied = insertTextWithUndo(replacement.text);

  if (!applied || textarea.value !== edit.text) {
    applied = replaceTextareaRange(textarea, replacement, edit.text);
  }

  if (!applied) return false;
  textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
  return true;
}

function getTextareaReplacement(currentText: string, nextText: string) {
  if (currentText === nextText) return;
  let start = 0;

  while (
    start < currentText.length &&
    start < nextText.length &&
    currentText[start] === nextText[start]
  ) {
    start++;
  }

  let currentEnd = currentText.length;
  let nextEnd = nextText.length;

  while (
    currentEnd > start &&
    nextEnd > start &&
    currentText[currentEnd - 1] === nextText[nextEnd - 1]
  ) {
    currentEnd--;
    nextEnd--;
  }

  return { end: currentEnd, start, text: nextText.slice(start, nextEnd) };
}

function focusTextarea(textarea: HTMLTextAreaElement) {
  try {
    textarea.focus({ preventScroll: true });
  } catch {
    textarea.focus();
  }
}

function insertTextWithUndo(text: string) {
  if (typeof document === 'undefined') return false;

  try {
    return document.execCommand('insertText', false, text);
  } catch {
    return false;
  }
}

function replaceTextareaRange(
  textarea: HTMLTextAreaElement,
  replacement: { end: number; start: number; text: string },
  nextText: string
) {
  if (!textarea.setRangeText) return false;

  textarea.setRangeText(
    replacement.text,
    replacement.start,
    replacement.end,
    'end'
  );

  return textarea.value === nextText;
}

function shouldSkipUndoCommand() {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform ?? '';
  const userAgent = navigator.userAgent ?? '';

  const hasCoarsePointer =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

  return (
    hasCoarsePointer ||
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
