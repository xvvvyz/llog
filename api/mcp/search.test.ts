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
                album: 'Dolor Drive',
                artists: ['Foo Artist'],
                end: 6000,
                start: 1000,
                title: 'Foo Bar',
              },
            ],
            transcript: [{ end: 12, start: 10, text: 'lorem ipsum' }],
            type: 'audio',
          },
        ],
        'dolor'
      )
    ).toEqual([
      {
        endSeconds: 6,
        fileId: 'file-1',
        fileName: 'set.mp3',
        kind: 'track',
        snippet: 'Foo Bar - Foo Artist',
        startSeconds: 1,
      },
    ]);

    expect(
      getFileMediaMatches(
        [
          {
            id: 'file-1',
            transcript: [{ end: 12, start: 10, text: 'lorem ipsum' }],
            type: 'audio',
          },
        ],
        'ipsum'
      )
    ).toEqual([
      {
        endSeconds: 12,
        fileId: 'file-1',
        kind: 'transcript',
        snippet: 'lorem ipsum',
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
            transcript: [{ end: 2, start: 0, text: 'Fóo bär baz' }],
            type: 'audio',
          },
        ],
        'foo bar'
      )
    ).toEqual([
      {
        fileId: 'file-1',
        endSeconds: 2,
        kind: 'transcript',
        snippet: 'Fóo bär baz',
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

  test('rejects bad cursors', () => {
    expect(() => parseSearchCursor(' ')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor(':')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor('1:')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor('next')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor('-1')).toThrow('Invalid search cursor');
    expect(() => parseSearchCursor('1:2:3')).toThrow('Invalid search cursor');
  });
});
