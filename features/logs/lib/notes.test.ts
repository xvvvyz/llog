import * as logNotes from '@/features/logs/lib/notes';
import { describe, expect, test } from 'bun:test';

describe('log notes', () => {
  test('shows manager preview', () => {
    expect(
      logNotes.canShowLogNotesPreview({ canManage: true, text: 'Shared memo' })
    ).toBe(true);
  });

  test('hides member preview', () => {
    expect(
      logNotes.canShowLogNotesPreview({ canManage: false, text: 'Shared memo' })
    ).toBe(false);
  });

  test('hides empty preview', () => {
    expect(
      logNotes.canShowLogNotesPreview({ canManage: true, text: '   ' })
    ).toBe(false);
  });
});
