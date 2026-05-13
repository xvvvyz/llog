import * as mediaMetadata from '@/domain/files/media-metadata';
import { describe, expect, test } from 'bun:test';

describe('parseStoredTracks', () => {
  test('parses tracks', () => {
    expect(
      mediaMetadata.parseStoredTracks([
        {
          album: 'Lorem Album',
          artists: ['Bar Artist'],
          end: 7000,
          genres: ['Dance'],
          isrc: 'ISRC1',
          label: 'Label',
          links: [{ provider: 'Spotify', url: 'https://open.spotify.com/1' }],
          releaseDate: '2026-01-02',
          score: 91,
          start: 5000,
          title: 'Bar',
          trackDuration: 120000,
          upc: 12345,
        },
        {
          artists: ['Foo Artist', null],
          artwork: { medium: 'https://images.example/art.jpg' },
          end: 3000,
          start: 1000,
          title: 'Foo',
        },
        { artists: ['Missing foo'], title: 'Baz' },
        { start: 0, title: '' },
        { end: 1000, start: 2000, title: 'Qux' },
      ])
    ).toEqual([
      {
        artists: ['Foo Artist'],
        artwork: 'https://images.example/art.jpg',
        endSeconds: 3,
        startSeconds: 1,
        title: 'Foo',
      },
      {
        album: 'Lorem Album',
        artists: ['Bar Artist'],
        endSeconds: 7,
        genres: ['Dance'],
        isrc: 'ISRC1',
        label: 'Label',
        links: [{ provider: 'spotify', url: 'https://open.spotify.com/1' }],
        releaseDate: '2026-01-02',
        score: 91,
        startSeconds: 5,
        title: 'Bar',
        trackDurationSeconds: 120,
        upc: '12345',
      },
    ]);
  });

  test('builds track search text', () => {
    const track = mediaMetadata.parseStoredTracks([
      {
        album: 'Lorem Search',
        artists: ['Foo Artist', 'Bar Artist'],
        start: 0,
        title: 'Foo Bar',
      },
    ])[0];

    expect(mediaMetadata.getTrackSearchSnippet(track)).toBe(
      'Foo Bar - Foo Artist, Bar Artist'
    );

    expect(mediaMetadata.getTrackSearchText(track)).toContain('Lorem Search');
  });
});

describe('parseStoredTranscriptSegments', () => {
  test('parses transcript segments', () => {
    expect(
      mediaMetadata.parseStoredTranscriptSegments([
        { end: 12, start: 10, text: 'lorem later' },
        { end: 4, start: 2, text: 'lorem early' },
        { end: 1, start: 2, text: 'backwards' },
        { end: 3, start: 3, text: '' },
        { end: 5, text: 'missing start' },
      ])
    ).toEqual([
      { endSeconds: 4, startSeconds: 2, text: 'lorem early' },
      { endSeconds: 12, startSeconds: 10, text: 'lorem later' },
    ]);
  });
});
