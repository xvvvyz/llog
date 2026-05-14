import { parseListentoTrackMetadata } from '@/api/audio-analysis/track-metadata';
import { describe, expect, test } from 'bun:test';

describe('parseListentoTrackMetadata', () => {
  test('parses preview metadata', () => {
    const metadata = parseListentoTrackMetadata(
      `
        <meta property="og:image" content="https://example.com/artwork.jpg" />
        <a href="https://open.spotify.com/track/1qbBwytmeuiZTxm1APaVcn">Spotify</a>
        <script>
          var tracks = [{"artist":"Preview Artist","track":"Preview Song - Night Mix","duration":154}];
        </script>
      `,
      new URL('https://lis.tn/pWqmbd')
    );

    expect(metadata).toMatchObject({
      artists: ['Preview Artist'],
      artwork: 'https://example.com/artwork.jpg',
      title: 'Preview Song - Night Mix',
    });

    expect(metadata?.links).toContainEqual({
      provider: 'spotify',
      url: 'https://open.spotify.com/track/1qbBwytmeuiZTxm1APaVcn',
    });
  });
});
