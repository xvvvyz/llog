import { describe, expect, test } from 'bun:test';
import * as audioMetadata from '@/features/files/lib/audio-metadata';

describe('parseAudioTracks', () => {
  test('filters invalid rows, sorts by start time, and normalizes display metadata', () => {
    const previousApiUrl = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';

    try {
      const tracks = audioMetadata.parseAudioTracks(
        [
          {
            album: 'Album',
            artists: ['Artist A', null, 'Artist B'],
            artwork: 'https://images.example/direct.jpg',
            links: [
              {
                provider: 'youtube',
                url: 'https://music.youtube.com/watch?v=1',
              },
              { provider: 'audd', url: 'https://lis.tn/source' },
              { provider: 'spotify', url: 'https://open.spotify.com/track/1' },
              { provider: 'spotify', url: 'https://open.spotify.com/track/2' },
              { provider: 'unknown', url: 'https://example.com/ignored' },
              {
                provider: 'applemusic',
                url: 'https://music.apple.com/track/1',
              },
            ],
            start: 3000,
            title: 'Second',
          },
          {
            artists: [],
            artwork: { medium: 'https://images.example/legacy.jpg' },
            links: [{ provider: 'audd', url: 'https://lis.tn/fallback' }],
            start: 1500,
            title: 'First',
          },
          { artists: ['Missing start'], title: 'Invalid' },
          { artists: ['Missing title'], start: 500 },
        ],
        { fileId: 'file/id' }
      );

      expect(tracks).toEqual([
        {
          artistText: 'Unknown artist',
          artwork:
            'https://api.example.test/files/file%2Fid/track-artwork?source=https%3A%2F%2Fimages.example%2Flegacy.jpg',
          links: [{ provider: 'audd', url: 'https://lis.tn/fallback' }],
          startSeconds: 1.5,
          title: 'First',
        },
        {
          album: 'Album',
          artistText: 'Artist A, Artist B',
          artwork:
            'https://api.example.test/files/file%2Fid/track-artwork?source=https%3A%2F%2Fimages.example%2Fdirect.jpg',
          links: [
            { provider: 'spotify', url: 'https://open.spotify.com/track/1' },
            { provider: 'applemusic', url: 'https://music.apple.com/track/1' },
            { provider: 'youtube', url: 'https://music.youtube.com/watch?v=1' },
          ],
          startSeconds: 3,
          title: 'Second',
        },
      ]);
    } finally {
      if (previousApiUrl == null) {
        delete process.env.EXPO_PUBLIC_API_URL;
      } else {
        process.env.EXPO_PUBLIC_API_URL = previousApiUrl;
      }
    }
  });
});

describe('parseTranscriptSegments', () => {
  test('filters invalid segments and sorts valid segments by start time', () => {
    expect(
      audioMetadata.parseTranscriptSegments([
        { end: 12, start: 10, text: 'later' },
        { end: 4, start: 2, text: 'early' },
        { end: 1, start: 2, text: 'backwards' },
        { end: 3, start: 3, text: '' },
        { end: 5, text: 'missing start' },
      ])
    ).toEqual([
      { endSeconds: 4, startSeconds: 2, text: 'early' },
      { endSeconds: 12, startSeconds: 10, text: 'later' },
    ]);
  });
});

describe('getTrackNavigationState', () => {
  const tracks = [
    { artistText: 'Artist', links: [], startSeconds: 0, title: 'Intro' },
    { artistText: 'Artist', links: [], startSeconds: 10, title: 'Middle' },
    { artistText: 'Artist', links: [], startSeconds: 30, title: 'Outro' },
  ];

  test('seeks to the previous track when playback is near the current track start', () => {
    expect(
      audioMetadata.getTrackNavigationState({
        currentTimeSeconds: 10.5,
        pendingTimeSeconds: 31,
        tracks,
      })
    ).toMatchObject({
      canSeekNext: true,
      canSeekPrevious: true,
      currentIndex: 1,
      isNearCurrentTrackStart: true,
      nextIndex: 2,
      pendingIndex: 2,
      previousIndex: 0,
    });
  });

  test('restarts the current track once playback is past the start threshold', () => {
    expect(
      audioMetadata.getTrackNavigationState({ currentTimeSeconds: 13, tracks })
    ).toMatchObject({
      currentIndex: 1,
      isNearCurrentTrackStart: false,
      previousIndex: 1,
    });
  });
});

describe('getTranscriptNavigationState', () => {
  const segments = [
    { endSeconds: 3, startSeconds: 0, text: 'Intro' },
    { endSeconds: 7, startSeconds: 4, text: 'Middle' },
    { endSeconds: 12, startSeconds: 8, text: 'Outro' },
  ];

  test('returns current and pending transcript segment indexes', () => {
    expect(
      audioMetadata.getTranscriptNavigationState({
        currentTimeSeconds: 5,
        pendingTimeSeconds: 9,
        segments,
      })
    ).toEqual({ currentIndex: 1, pendingIndex: 2 });
  });

  test('uses the first segment before transcript playback has reached it', () => {
    expect(
      audioMetadata.getTranscriptNavigationState({ currentTimeSeconds: -1, segments })
    ).toEqual({ currentIndex: 0, pendingIndex: -1 });
  });
});
