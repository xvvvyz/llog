import * as sourceAssembly from '@/domain/cards/source-assembly';
import * as cardAnalysis from '@/domain/cards/analysis';
import { describe, expect, test } from 'bun:test';

const baseRecord = {
  author: { name: 'Cade' },
  date: '2026-05-20T10:00:00.000Z',
  id: 'record-1',
  logId: 'log-1',
  status: 'published',
  tags: [{ id: 'tag-a', name: 'Session' }],
};

describe('card source assembly', () => {
  test('folds nested sources', () => {
    const record = sourceAssembly.assembleCardLlmRecord({
      ...baseRecord,
      files: [
        {
          order: 2,
          transcript: [{ end: 3.5, start: 1, text: 'Record audio note.' }],
          type: 'audio',
        },
      ],
      replies: [
        {
          author: { name: 'Mina' },
          date: '2026-05-20T11:15:00.000Z',
          files: [
            {
              order: 1,
              transcript: [
                { end: 9, start: 4.25, text: 'Reply audio detail.' },
              ],
              type: 'video',
            },
          ],
          id: 'reply-1',
          isDraft: false,
          text: 'Reply follow-up.',
        },
      ],
      text: 'Parent note.',
    });

    expect(record?.sourceAssemblyVersion).toBe('folded-v1');

    expect(record?.text).toContain(
      '[record | author: Cade | time: 2026-05-20T10:00:00.000Z]'
    );

    expect(record?.text).toContain('Parent note.');
    expect(record?.text).toContain('Audio transcript:\nRecord audio note.');

    expect(record?.text).toContain(
      '[reply | author: Mina | time: 2026-05-20T11:15:00.000Z]'
    );

    expect(record?.text).toContain('Reply follow-up.');
    expect(record?.text).toContain('Video transcript:\nReply audio detail.');
    expect(record?.text).not.toContain('offset:');
    expect(record?.text).not.toContain('record-1');
    expect(record?.text).not.toContain('reply-1');
  });

  test('uses nested content without parent text', () => {
    const [record] = sourceAssembly.assembleCardLlmRecords([
      {
        ...baseRecord,
        replies: [
          {
            author: { name: 'Mina' },
            date: '2026-05-20T11:15:00.000Z',
            id: 'reply-1',
            isDraft: false,
            text: 'Only reply content.',
          },
        ],
        text: '   ',
      },
    ]);

    expect(record?.text).toContain('Only reply content.');
  });

  test('excludes drafts and empty records', () => {
    const records = sourceAssembly.assembleCardLlmRecords([
      {
        ...baseRecord,
        id: 'empty',
        replies: [
          {
            author: { name: 'Mina' },
            date: '2026-05-20T11:15:00.000Z',
            id: 'draft-reply',
            isDraft: true,
            text: 'Draft content.',
          },
        ],
        text: '',
      },
    ]);

    expect(records).toEqual([]);
  });

  test('fingerprints folded text', () => {
    const first = sourceAssembly.assembleCardLlmRecord({
      ...baseRecord,
      replies: [
        {
          author: { name: 'Mina' },
          date: '2026-05-20T11:15:00.000Z',
          id: 'reply-1',
          isDraft: false,
          text: 'First reply.',
        },
      ],
      text: 'Parent note.',
    });

    const second = sourceAssembly.assembleCardLlmRecord({
      ...baseRecord,
      replies: [
        {
          author: { name: 'Rae' },
          date: '2026-05-20T11:16:00.000Z',
          id: 'reply-1',
          isDraft: false,
          text: 'First reply.',
        },
      ],
      text: 'Parent note.',
    });

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();

    const firstFingerprint = cardAnalysis.recordFingerprint({
      record: first!,
      selectedTagIds: ['tag-a'],
    });

    const secondFingerprint = cardAnalysis.recordFingerprint({
      record: second!,
      selectedTagIds: ['tag-a'],
    });

    expect(firstFingerprint).not.toBe(secondFingerprint);
  });
});
