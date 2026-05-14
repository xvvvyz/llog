import { getFileMediaMatches, parseSearchCursor } from '@/api/mcp/search';
import { describe, expect, test } from 'bun:test';

describe('getFileMediaMatches', () => {
  test('matches media text', () => {
    expect(
      getFileMediaMatches(
        [
          {
            id: 'file-1',
            name: 'set.mp3',
            tracks: [
              {
                album: 'Evening Drive',
                artists: ['First Artist'],
                end: 6000,
                start: 1000,
                title: 'Daily Recap',
              },
            ],
            transcript: [{ end: 12, start: 10, text: 'meeting notes' }],
            type: 'audio',
          },
        ],
        'evening'
      )
    ).toEqual([
      {
        endSeconds: 6,
        fileId: 'file-1',
        fileName: 'set.mp3',
        kind: 'track',
        snippet: 'Daily Recap - First Artist',
        startSeconds: 1,
      },
    ]);

    expect(
      getFileMediaMatches(
        [
          {
            id: 'file-1',
            transcript: [{ end: 12, start: 10, text: 'meeting notes' }],
            type: 'audio',
          },
        ],
        'notes'
      )
    ).toEqual([
      {
        endSeconds: 12,
        fileId: 'file-1',
        kind: 'transcript',
        snippet: 'meeting notes',
        startSeconds: 10,
      },
    ]);
  });

  test('matches accents loosely', () => {
    expect(
      getFileMediaMatches(
        [
          {
            id: 'file-1',
            transcript: [{ end: 2, start: 0, text: 'Café résumé note' }],
            type: 'audio',
          },
        ],
        'cafe resume'
      )
    ).toEqual([
      {
        fileId: 'file-1',
        endSeconds: 2,
        kind: 'transcript',
        snippet: 'Café résumé note',
        startSeconds: 0,
      },
    ]);
  });
});

describe('parseSearchCursor', () => {
  test('parses cursors', () => {
    expect(parseSearchCursor()).toEqual({ offset: 0, skip: 0 });
    expect(parseSearchCursor('25')).toEqual({ offset: 25, skip: 0 });
    expect(parseSearchCursor('25:3')).toEqual({ offset: 25, skip: 3 });
  });

  test('rejects invalid cursors', () => {
    expect(() => parseSearchCursor(' ')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor(':')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor('1:')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor('next')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor('-1')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor('1:2:3')).toThrow('Invalid search cursor');
  });
});
