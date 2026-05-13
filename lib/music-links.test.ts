import * as musicLinks from '@/lib/music-links';
import { describe, expect, test } from 'bun:test';

const publicMusicLink = (value: string) =>
  musicLinks.getPublicMusicLink(new URL(value));

describe('music link provider helpers', () => {
  test('classifies providers', () => {
    expect(musicLinks.isSourceMusicLinkProvider('audd')).toBe(true);
    expect(musicLinks.isPublicMusicLinkProvider('spotify')).toBe(true);
    expect(musicLinks.isPublicMusicLinkProvider('audd')).toBe(false);
    expect(musicLinks.isVisibleMusicLinkProvider('youtube')).toBe(true);
    expect(musicLinks.isVisibleMusicLinkProvider('unknown')).toBe(false);
  });

  test('orders provider labels', () => {
    expect(
      ['tidal', 'unknown', 'spotify'].sort(
        (left, right) =>
          musicLinks.getVisibleMusicLinkProviderOrder(left) -
          musicLinks.getVisibleMusicLinkProviderOrder(right)
      )
    ).toEqual(['spotify', 'tidal', 'unknown']);

    expect(musicLinks.getMusicLinkProviderLabel(' applemusic ')).toBe(
      'Apple Music'
    );

    expect(musicLinks.getMusicLinkProviderLabel('bandcamp')).toBe('Bandcamp');
    expect(musicLinks.getMusicLinkProviderLabel('   ')).toBe('Link');
  });
});

describe('getPublicMusicLink', () => {
  test('normalizes music URLs', () => {
    expect(
      publicMusicLink(
        'http://open.spotify.com/track/abc?si=share&utm_source=copy&context=album'
      )
    ).toEqual({
      provider: 'spotify',
      url: 'https://open.spotify.com/track/abc?context=album',
    });

    expect(
      publicMusicLink(
        'https://music.apple.com/us/album/song/id123?i=456&at=affiliate&utm_medium=social'
      )
    ).toEqual({
      provider: 'applemusic',
      url: 'https://music.apple.com/us/album/song/id123?i=456',
    });
  });

  test('detects music URLs', () => {
    expect(
      publicMusicLink('https://youtu.be/video-id?utm_campaign=share')
    ).toEqual({ provider: 'youtube', url: 'https://youtu.be/video-id' });

    expect(publicMusicLink('https://listen.tidal.com/track/123')).toEqual({
      provider: 'tidal',
      url: 'https://listen.tidal.com/track/123',
    });

    expect(
      publicMusicLink('https://open.spotify.com/album/abc')
    ).toBeUndefined();

    expect(publicMusicLink('https://example.com/track/abc')).toBeUndefined();
  });
});
