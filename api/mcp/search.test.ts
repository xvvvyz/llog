import { getFileMediaMatches, parseSearchCursor } from '@/api/mcp/search';
import type * as mcpTypes from '@/api/mcp/types';
import type { ParsedSearchQuery } from '@/lib/search';
import { describe, expect, test } from 'bun:test';
import * as searchHelpers from '@/api/mcp/search-helpers';

const parsedKeywordQuery = (
  text: string,
  filters: Partial<ParsedSearchQuery['filters']> = {}
): ParsedSearchQuery => ({
  filters: { author: [], log: [], tag: [], ...filters },
  text,
});

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

describe('getRecordSearchResults', () => {
  test('does not include replies for record tag searches', () => {
    const record: mcpTypes.McpRecord = {
      date: '2026-06-15T12:00:00.000Z',
      id: 'record-1',
      log: { id: 'log-1', name: 'Daily' },
      replies: [
        {
          date: '2026-06-15T12:05:00.000Z',
          id: 'reply-1',
          text: 'Needle is only in this comment',
        },
      ],
      status: 'published',
      tags: [{ id: 'tag-1', name: 'Tagged' }],
      text: 'Record body',
    };

    expect(
      searchHelpers
        .getRecordSearchResults({
          parsedQuery: parsedKeywordQuery('needle'),
          query: 'needle',
          record,
        })
        .map((result) => result.type)
    ).toEqual(['reply']);

    expect(
      searchHelpers.getRecordSearchResults({
        parsedQuery: parsedKeywordQuery('needle'),
        query: 'needle',
        record,
        recordTagIdSet: new Set(['tag-1']),
      })
    ).toEqual([]);

    expect(
      searchHelpers.getRecordSearchResults({
        parsedQuery: parsedKeywordQuery('needle', { tag: ['tagged'] }),
        query: 'needle',
        record,
      })
    ).toEqual([]);
  });
});

describe('getLogSearchResult', () => {
  const log: mcpTypes.McpLog = {
    id: 'log-1',
    name: 'Health',
    note: { text: 'Call dentist on Friday' },
    tags: [{ id: 'tag-1', name: 'Personal', order: 0 }],
  };

  test('matches note text', () => {
    expect(
      searchHelpers.getLogSearchResult({
        log,
        parsedQuery: parsedKeywordQuery('dentist'),
        query: 'dentist',
      })
    ).toEqual({ log, type: 'log' });

    expect(
      searchHelpers.getLogSearchResult({
        log,
        parsedQuery: parsedKeywordQuery('missing'),
        query: 'missing',
      })
    ).toBeUndefined();
  });

  test('surfaces note in fields', () => {
    expect(searchHelpers.searchResultFields({ log, type: 'log' })).toEqual({
      log: {
        id: 'log-1',
        name: 'Health',
        note: 'Call dentist on Friday',
        tags: [{ name: 'Personal', order: 0 }],
      },
      type: 'log',
    });
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
