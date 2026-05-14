import * as visualMedia from '@/features/files/lib/visual-media';
import { describe, expect, test } from 'bun:test';

describe('getThumbnailUri', () => {
  test('uses image asset keys', () => {
    expect(
      visualMedia.getThumbnailUri({
        assetKey: 'cf-image:https://imagedelivery.net/account/image-id/public',
        type: 'image',
      })
    ).toBe('https://imagedelivery.net/account/image-id/public');
  });

  test('keeps video thumbnail behavior', () => {
    expect(
      visualMedia.getThumbnailUri({
        assetKey: 'records/video.mp4',
        thumbnailUri: 'https://example.com/thumb.jpg',
        type: 'video',
      })
    ).toBe('https://example.com/thumb.jpg');
  });
});
