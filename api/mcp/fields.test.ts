import * as mcpFields from '@/api/mcp/fields';
import { describe, expect, test } from 'bun:test';

describe('fileFields', () => {
  test('emits normalized read-only media metadata for analyzed files', () => {
    const fields = mcpFields.compact(
      mcpFields.fileFields({
        id: 'file-1',
        name: 'set.mp3',
        tracks: [
          {
            album: 'Album',
            artists: ['Artist'],
            end: 6500,
            start: 1500,
            title: 'Track',
            trackDuration: 200000,
          },
        ],
        transcript: [{ end: 4, start: 2, text: 'spoken words' }],
        type: 'audio',
      })
    );

    expect(fields).toMatchObject({
      id: 'file-1',
      name: 'set.mp3',
      trackCount: 1,
      tracks: [
        {
          album: 'Album',
          artists: ['Artist'],
          endSeconds: 6.5,
          startSeconds: 1.5,
          title: 'Track',
          trackDurationSeconds: 200,
        },
      ],
      transcript: [{ endSeconds: 4, startSeconds: 2, text: 'spoken words' }],
      transcriptSegmentCount: 1,
      type: 'audio',
    });
  });

  test('keeps counts for empty analyzed metadata while compacting empty arrays', () => {
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
  test('preserves explicit false values for non-state result fields', () => {
    expect(mcpFields.textResult({ pinned: false }).structuredContent).toEqual({
      pinned: false,
    });
  });
});

describe('textBlock', () => {
  test('preserves newlines in a fenced text block', () => {
    expect(mcpFields.textBlock('Text', 'Line 1\nLine 2')).toBe(
      'Text:\n```text\nLine 1\nLine 2\n```'
    );
  });

  test('uses a longer fence when the text contains backticks', () => {
    expect(mcpFields.textBlock('Text', '```\nvalue\n```')).toBe(
      'Text:\n````text\n```\nvalue\n```\n````'
    );
  });
});

describe('recordSummaryFields', () => {
  test('serializes Date values for structured output', () => {
    expect(
      mcpFields.recordSummaryFields({
        date: new Date('2026-01-02T03:04:05.000Z'),
        id: 'record-1',
      })
    ).toMatchObject({ date: '2026-01-02T03:04:05.000Z', id: 'record-1' });
  });

  test('includes record URLs when appUrl is available', () => {
    expect(
      mcpFields.recordSummaryFields(
        { date: new Date('2026-01-02T03:04:05.000Z'), id: 'record 1' },
        { appUrl: 'https://llog.example' }
      )
    ).toMatchObject({ url: 'https://llog.example/records/record%201' });
  });
});
