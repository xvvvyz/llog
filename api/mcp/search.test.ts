import { getFileMediaMatches, parseSearchCursor } from '@/api/mcp/search';
import { describe, expect, test } from 'bun:test';

describe('getFileMediaMatches', () => {
  test('finds media-only track and transcript matches with snippets and timing', () => {
    expect(
      getFileMediaMatches(
        [
          {
            id: 'file-1',
            name: 'set.mp3',
            tracks: [
              {
                album: 'Night Drive',
                artists: ['Artist'],
                end: 6000,
                start: 1000,
                title: 'Track Title',
              },
            ],
            transcript: [{ end: 12, start: 10, text: 'spoken phrase' }],
            type: 'audio',
          },
        ],
        'drive'
      )
    ).toEqual([
      {
        endSeconds: 6,
        fileId: 'file-1',
        fileName: 'set.mp3',
        kind: 'track',
        snippet: 'Track Title - Artist',
        startSeconds: 1,
      },
    ]);

    expect(
      getFileMediaMatches(
        [
          {
            id: 'file-1',
            transcript: [{ end: 12, start: 10, text: 'spoken phrase' }],
            type: 'audio',
          },
        ],
        'phrase'
      )
    ).toEqual([
      {
        endSeconds: 12,
        fileId: 'file-1',
        kind: 'transcript',
        snippet: 'spoken phrase',
        startSeconds: 10,
      },
    ]);
  });

  test('finds media matches without requiring accents', () => {
    expect(
      getFileMediaMatches(
        [
          {
            id: 'file-1',
            transcript: [{ end: 2, start: 0, text: 'México está aquí' }],
            type: 'audio',
          },
        ],
        'mexico esta'
      )
    ).toEqual([
      {
        fileId: 'file-1',
        endSeconds: 2,
        kind: 'transcript',
        snippet: 'México está aquí',
        startSeconds: 0,
      },
    ]);
  });
});

describe('parseSearchCursor', () => {
  test('parses empty, offset-only, and offset-with-skip cursors', () => {
    expect(parseSearchCursor()).toEqual({ offset: 0, skip: 0 });
    expect(parseSearchCursor('25')).toEqual({ offset: 25, skip: 0 });
    expect(parseSearchCursor('25:3')).toEqual({ offset: 25, skip: 3 });
  });

  test('rejects malformed cursors', () => {
    expect(() => parseSearchCursor(' ')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor(':')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor('1:')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor('next')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor('-1')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor('1:2:3')).toThrow('Invalid search cursor');
  });
});
