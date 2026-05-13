import { parseListentoTrackMetadata } from '@/api/audio-analysis/track-metadata';
import { describe, expect, test } from 'bun:test';

describe('parseListentoTrackMetadata', () => {
  test('parses preview metadata', () => {
    const metadata = parseListentoTrackMetadata(
      `
        <meta property="og:image" content="https://example.com/artwork.jpg" />
        <a href="https://open.spotify.com/track/1qbBwytmeuiZTxm1APaVcn">Spotify</a>
        <script>
          var tracks = [{"artist":"Foo Artist","track":"Foo Bar - Baz Remix","duration":154}];
        </script>
      `,
      new URL('https://lis.tn/pWqmbd')
    );

    expect(metadata).toMatchObject({
      artists: ['Foo Artist'],
      artwork: 'https://example.com/artwork.jpg',
      title: 'Foo Bar - Baz Remix',
    });

    expect(metadata?.links).toContainEqual({
      provider: 'spotify',
      url: 'https://open.spotify.com/track/1qbBwytmeuiZTxm1APaVcn',
    });
  });
});
