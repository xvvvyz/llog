import { parseListentoTrackMetadata } from '@/api/audio-analysis/track-metadata';
import { describe, expect, test } from 'bun:test';

describe('parseListentoTrackMetadata', () => {
  test('uses the embedded preview track identity from AudD song links', () => {
    const metadata = parseListentoTrackMetadata(
      `
        <meta property="og:image" content="https://example.com/artwork.jpg" />
        <a href="https://open.spotify.com/track/1qbBwytmeuiZTxm1APaVcn">Spotify</a>
        <script>
          var tracks = [{"artist":"Lamb","track":"Overkill - Dance Remix","duration":154}];
        </script>
      `,
      new URL('https://lis.tn/pWqmbd')
    );

    expect(metadata).toMatchObject({
      artists: ['Lamb'],
      artwork: 'https://example.com/artwork.jpg',
      title: 'Overkill - Dance Remix',
    });

    expect(metadata?.links).toContainEqual({
      provider: 'spotify',
      url: 'https://open.spotify.com/track/1qbBwytmeuiZTxm1APaVcn',
    });
  });
});
