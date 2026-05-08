import * as mediaMetadata from '@/domain/files/media-metadata';
import { describe, expect, test } from 'bun:test';

describe('parseStoredTracks', () => {
  test('filters invalid rows, sorts by start time, and converts timing to seconds', () => {
    expect(
      mediaMetadata.parseStoredTracks([
        {
          album: 'Album',
          artists: ['Artist B'],
          end: 7000,
          genres: ['Dance'],
          isrc: 'ISRC1',
          label: 'Label',
          links: [{ provider: 'Spotify', url: 'https://open.spotify.com/1' }],
          releaseDate: '2026-01-02',
          score: 91,
          start: 5000,
          title: 'Later',
          trackDuration: 120000,
          upc: 12345,
        },
        {
          artists: ['Artist A', null],
          artwork: { medium: 'https://images.example/art.jpg' },
          end: 3000,
          start: 1000,
          title: 'Early',
        },
        { artists: ['Missing start'], title: 'Invalid' },
        { start: 0, title: '' },
        { end: 1000, start: 2000, title: 'Backwards' },
      ])
    ).toEqual([
      {
        artists: ['Artist A'],
        artwork: 'https://images.example/art.jpg',
        endSeconds: 3,
        startSeconds: 1,
        title: 'Early',
      },
      {
        album: 'Album',
        artists: ['Artist B'],
        endSeconds: 7,
        genres: ['Dance'],
        isrc: 'ISRC1',
        label: 'Label',
        links: [{ provider: 'spotify', url: 'https://open.spotify.com/1' }],
        releaseDate: '2026-01-02',
        score: 91,
        startSeconds: 5,
        title: 'Later',
        trackDurationSeconds: 120,
        upc: '12345',
      },
    ]);
  });

  test('builds searchable track snippets from title, artists, and album text', () => {
    const track = mediaMetadata.parseStoredTracks([
      {
        album: 'Searchable Album',
        artists: ['Artist A', 'Artist B'],
        start: 0,
        title: 'Track Title',
      },
    ])[0];

    expect(mediaMetadata.getTrackSearchSnippet(track)).toBe(
      'Track Title - Artist A, Artist B'
    );

    expect(mediaMetadata.getTrackSearchText(track)).toContain(
      'Searchable Album'
    );
  });
});

describe('parseStoredTranscriptSegments', () => {
  test('filters invalid segments, sorts by start time, and preserves seconds', () => {
    expect(
      mediaMetadata.parseStoredTranscriptSegments([
        { end: 12, start: 10, text: 'later transcript' },
        { end: 4, start: 2, text: 'early transcript' },
        { end: 1, start: 2, text: 'backwards' },
        { end: 3, start: 3, text: '' },
        { end: 5, text: 'missing start' },
      ])
    ).toEqual([
      { endSeconds: 4, startSeconds: 2, text: 'early transcript' },
      { endSeconds: 12, startSeconds: 10, text: 'later transcript' },
    ]);
  });
});
