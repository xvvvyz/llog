import { describe, expect, test } from 'bun:test';
import { findReusableRecordDraft } from '@/features/records/lib/record-draft-selection';

describe('record draft selection', () => {
  test('ignores submitted drafts', () => {
    const draft = findReusableRecordDraft({
      ignoredDraftIds: new Set(['record-a']),
      logId: 'log-a',
      records: [
        { id: 'record-a', log: { id: 'log-a' } },
        { id: 'record-b', log: { id: 'log-a' } },
      ],
    });

    expect(draft?.id).toBe('record-b');
  });

  test('ignores outbox drafts', () => {
    const draft = findReusableRecordDraft({
      logId: 'log-a',
      outboxDraftIds: new Set(['record-a']),
      records: [
        { id: 'record-a', log: { id: 'log-a' } },
        { id: 'record-b', log: { id: 'log-b' } },
      ],
    });

    expect(draft).toBeUndefined();
  });
});
