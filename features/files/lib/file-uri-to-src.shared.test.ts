import * as fileUriToSrcShared from '@/features/files/lib/file-uri-to-src.shared';
import { afterEach, describe, expect, test } from 'bun:test';

const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

afterEach(() => {
  if (originalApiUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
    return;
  }

  process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
});

describe('getFileSourceUri', () => {
  test('prefers explicit uri, then asset key, then null', () => {
    expect(
      fileUriToSrcShared.getFileSourceUri({
        assetKey: 'records/file.jpg',
        uri: 'file://x',
      })
    ).toBe('file://x');

    expect(
      fileUriToSrcShared.getFileSourceUri({ assetKey: 'records/file.jpg' })
    ).toBe('records/file.jpg');

    expect(fileUriToSrcShared.getFileSourceUri({})).toBeNull();
  });
});

describe('fileUriToSrc', () => {
  test('builds API file URLs for stored asset keys', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.llog.example';

    expect(fileUriToSrcShared.fileUriToSrc('records/record-1/file.jpg')).toBe(
      'https://api.llog.example/files/records/record-1/file.jpg'
    );
  });

  test('rewrites Cloudflare Image URLs to flexible variants', () => {
    expect(
      fileUriToSrcShared.fileUriToSrc(
        'https://imagedelivery.net/account/image-id/public',
        { quality: 88, targetHeight: 200.2, targetWidth: 320.6 }
      )
    ).toBe(
      'https://imagedelivery.net/account/image-id/format=webp,q=88,w=321,h=200'
    );

    expect(
      fileUriToSrcShared.fileUriToSrc(
        'https://example.com/cdn-cgi/imagedelivery/account/image-id/public',
        { targetSize: 512 }
      )
    ).toBe(
      'https://example.com/cdn-cgi/imagedelivery/account/image-id/format=webp,q=75,w=512,h=512'
    );
  });

  test('adds clamped Stream thumbnail dimensions without changing ordinary URLs', () => {
    expect(
      fileUriToSrcShared.fileUriToSrc(
        'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s',
        { targetHeight: 9, targetWidth: 2501 }
      )
    ).toBe(
      'https://customer.cloudflarestream.com/video/thumbnails/thumbnail.jpg?time=1s&width=2000&height=10'
    );

    expect(
      fileUriToSrcShared.fileUriToSrc('https://example.com/file.jpg', {
        targetWidth: 400,
      })
    ).toBe('https://example.com/file.jpg');
  });
});
