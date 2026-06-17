import * as cachedMediaSource from '@/features/files/lib/cached-media-source';
import { describe, expect, test } from 'bun:test';

describe('cached image sources', () => {
  test('selects largest variant', () => {
    const requested =
      'https://imagedelivery.net/account/image-id/format=webp,q=75,w=512,h=512';

    expect(
      cachedMediaSource.findLargestCachedImageSource(requested, [
        'https://imagedelivery.net/account/other/format=webp,q=75,w=2000,h=2000',
        'https://imagedelivery.net/account/image-id/format=webp,q=75,w=512,h=512',
        'https://imagedelivery.net/account/image-id/format=webp,q=75,w=1024,h=1024',
      ])
    ).toBe(
      'https://imagedelivery.net/account/image-id/format=webp,q=75,w=1024,h=1024'
    );
  });

  test('matches stream thumbnails', () => {
    const requested =
      'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&width=400&height=200';

    expect(
      cachedMediaSource.findLargestCachedImageSource(requested, [
        'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=2s&width=2000&height=1000',
        'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&width=800&height=400',
      ])
    ).toBe(
      'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&width=800&height=400'
    );
  });

  test('ranks width-only stream thumbnails', () => {
    const requested =
      'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&width=512';

    expect(
      cachedMediaSource.findLargestCachedImageSource(requested, [
        'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&width=128',
        'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&width=1024',
        'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&width=512',
      ])
    ).toBe(
      'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&width=1024'
    );
  });

  test('ranks height-only stream thumbnails', () => {
    const requested =
      'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&height=288';

    expect(
      cachedMediaSource.findLargestCachedImageSource(requested, [
        'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&height=144',
        'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&height=720',
        'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&height=288',
      ])
    ).toBe(
      'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&height=720'
    );
  });

  test('uses exact fallback', () => {
    expect(
      cachedMediaSource.findLargestCachedImageSource(
        'https://example.com/image.jpg',
        ['https://example.com/image.jpg']
      )
    ).toBe('https://example.com/image.jpg');
  });
});
