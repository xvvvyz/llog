import * as mediaMetadata from '@/domain/files/media-metadata';
import { describe, expect, test } from 'bun:test';

describe('parseStoredTracks', () => {
  test('parses tracks', () => {
    expect(
      mediaMetadata.parseStoredTracks([
        {
          album: 'Evening Notes',
          artists: ['Second Artist'],
          end: 7000,
          genres: ['Dance'],
          isrc: 'ISRC1',
          label: 'Label',
          links: [{ provider: 'Spotify', url: 'https://open.spotify.com/1' }],
          releaseDate: '2026-01-02',
          score: 91,
          start: 5000,
          title: 'Second Track',
          trackDuration: 120000,
          upc: 12345,
        },
        {
          artists: ['First Artist', null],
          artwork: { medium: 'https://images.example/art.jpg' },
          end: 3000,
          start: 1000,
          title: 'First Track',
        },
        { artists: ['Missing artist'], title: 'Missing title' },
        { start: 0, title: '' },
        { end: 1000, start: 2000, title: 'Backwards Track' },
      ])
    ).toEqual([
      {
        artists: ['First Artist'],
        artwork: 'https://images.example/art.jpg',
        endSeconds: 3,
        startSeconds: 1,
        title: 'First Track',
      },
      {
        album: 'Evening Notes',
        artists: ['Second Artist'],
        endSeconds: 7,
        genres: ['Dance'],
        isrc: 'ISRC1',
        label: 'Label',
        links: [{ provider: 'spotify', url: 'https://open.spotify.com/1' }],
        releaseDate: '2026-01-02',
        score: 91,
        startSeconds: 5,
        title: 'Second Track',
        trackDurationSeconds: 120,
        upc: '12345',
      },
    ]);
  });

  test('builds track search text', () => {
    const track = mediaMetadata.parseStoredTracks([
      {
        album: 'Search Notes',
        artists: ['First Artist', 'Second Artist'],
        start: 0,
        title: 'Daily Recap',
      },
    ])[0];

    expect(mediaMetadata.getTrackSearchSnippet(track)).toBe(
      'Daily Recap - First Artist, Second Artist'
    );

    expect(mediaMetadata.getTrackSearchText(track)).toContain('Search Notes');
  });
});

describe('parseStoredTranscriptSegments', () => {
  test('parses transcript segments', () => {
    expect(
      mediaMetadata.parseStoredTranscriptSegments([
        { end: 12, start: 10, text: 'later note' },
        { end: 4, start: 2, text: 'early note' },
        { end: 1, start: 2, text: 'backwards' },
        { end: 3, start: 3, text: '' },
        { end: 5, text: 'missing start' },
      ])
    ).toEqual([
      { endSeconds: 4, startSeconds: 2, text: 'early note' },
      { endSeconds: 12, startSeconds: 10, text: 'later note' },
    ]);
  });
});
