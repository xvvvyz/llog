import * as mcpFields from '@/api/mcp/fields';
import { describe, expect, test } from 'bun:test';

describe('fileFields', () => {
  test('serializes media fields', () => {
    const fields = mcpFields.compact(
      mcpFields.fileFields({
        id: 'file-1',
        name: 'set.mp3',
        tracks: [
          {
            album: 'Evening Notes',
            artists: ['First Artist'],
            end: 6500,
            start: 1500,
            title: 'Daily Recap',
            trackDuration: 200000,
          },
        ],
        transcript: [{ end: 4, start: 2, text: 'meeting notes' }],
        type: 'audio',
      })
    );

    expect(fields).toMatchObject({
      id: 'file-1',
      name: 'set.mp3',
      trackCount: 1,
      tracks: [
        {
          album: 'Evening Notes',
          artists: ['First Artist'],
          endSeconds: 6.5,
          startSeconds: 1.5,
          title: 'Daily Recap',
          trackDurationSeconds: 200,
        },
      ],
      transcript: [{ endSeconds: 4, startSeconds: 2, text: 'meeting notes' }],
      transcriptSegmentCount: 1,
      type: 'audio',
    });
  });

  test('keeps empty counts', () => {
    expect(
      mcpFields.compact(
        mcpFields.fileFields({
          id: 'file-1',
          tracks: [],
          transcript: [],
          type: 'audio',
        })
      )
    ).toEqual({
      id: 'file-1',
      trackCount: 0,
      transcriptSegmentCount: 0,
      type: 'audio',
    });
  });
});

describe('textResult', () => {
  test('keeps false values', () => {
    expect(mcpFields.textResult({ pinned: false }).structuredContent).toEqual({
      pinned: false,
    });
  });
});

describe('table', () => {
  test('keeps cell breaks', () => {
    expect(mcpFields.table(['Text'], [['Line 1\nLine 2']])).toBe(
      'Text:\n```text\nLine 1\nLine 2\n```'
    );
  });

  test('labels multiline rows', () => {
    expect(
      mcpFields.table(
        ['Date', 'Text'],
        [
          ['2026-01-02', 'Line 1\nLine 2'],
          ['2026-01-03', 'Next'],
        ]
      )
    ).toBe(
      [
        'Item 1',
        'Date: 2026-01-02',
        'Text:',
        '```text',
        'Line 1',
        'Line 2',
        '```',
        '',
        'Item 2',
        'Date: 2026-01-03',
        'Text: Next',
      ].join('\n')
    );
  });
});

describe('textPreview', () => {
  test('keeps line breaks', () => {
    expect(mcpFields.textPreview('Line 1\nLine 2')).toBe('Line 1\nLine 2');
  });

  test('normalizes carriage returns', () => {
    expect(mcpFields.textPreview('Line 1\r\nLine 2\rLine 3')).toBe(
      'Line 1\nLine 2\nLine 3'
    );
  });
});

describe('textBlock', () => {
  test('fences text', () => {
    expect(mcpFields.textBlock('Text', 'Line 1\nLine 2')).toBe(
      'Text:\n```text\nLine 1\nLine 2\n```'
    );
  });

  test('escapes fences', () => {
    expect(mcpFields.textBlock('Text', '```\nvalue\n```')).toBe(
      'Text:\n````text\n```\nvalue\n```\n````'
    );
  });
});

describe('recordSummaryFields', () => {
  test('serializes dates', () => {
    expect(
      mcpFields.recordSummaryFields({
        date: new Date('2026-01-02T03:04:05.000Z'),
        id: 'record-1',
      })
    ).toMatchObject({ date: '2026-01-02T03:04:05.000Z', id: 'record-1' });
  });

  test('keeps text line breaks', () => {
    expect(
      mcpFields.recordSummaryFields({
        date: new Date('2026-01-02T03:04:05.000Z'),
        id: 'record-1',
        text: 'Line 1\nLine 2',
      })
    ).toMatchObject({ text: 'Line 1\nLine 2' });
  });

  test('adds record URLs', () => {
    expect(
      mcpFields.recordSummaryFields(
        { date: new Date('2026-01-02T03:04:05.000Z'), id: 'record 1' },
        { appUrl: 'https://llog.example' }
      )
    ).toMatchObject({ url: 'https://llog.example/records/record%201' });
  });
});
