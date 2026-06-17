import { describe, expect, test } from 'bun:test';
import { normalizePublicOrigin } from '@/api/oauth/origin';

describe('normalizePublicOrigin', () => {
  test('keeps request origin when app url is missing', () => {
    const request = new Request(
      'http://169.254.19.27:8787/api/v1/files/avatar'
    );

    expect(normalizePublicOrigin(request).url).toBe(request.url);
  });

  test('keeps request origin when app url is invalid', () => {
    const request = new Request(
      'http://169.254.19.27:8787/api/v1/files/avatar'
    );

    expect(normalizePublicOrigin(request, 'localhost:8787').url).toBe(
      request.url
    );
  });

  test('rewrites request origin when app url is configured', () => {
    const request = new Request(
      'http://169.254.19.27:8787/api/v1/oauth/register?name=client'
    );

    expect(normalizePublicOrigin(request, 'https://llog.app').url).toBe(
      'https://llog.app/api/v1/oauth/register?name=client'
    );
  });
});
