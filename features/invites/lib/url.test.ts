import * as url from '@/features/invites/lib/url';
import { afterEach, describe, expect, it } from 'bun:test';

const originalAppUrl = process.env.EXPO_PUBLIC_APP_URL;

afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.EXPO_PUBLIC_APP_URL;
    return;
  }

  process.env.EXPO_PUBLIC_APP_URL = originalAppUrl;
});

describe('getInviteUrl', () => {
  it('builds invite links from the configured app URL', () => {
    process.env.EXPO_PUBLIC_APP_URL = 'https://llog.example';

    expect(url.getInviteUrl('invite-token')).toBe(
      'https://llog.example/invite/invite-token'
    );
  });

  it('normalizes trailing slashes and encodes the token as a path segment', () => {
    expect(url.getInviteUrl('team/a b', ' https://llog.example/// ')).toBe(
      'https://llog.example/invite/team%2Fa%20b'
    );
  });

  it('rejects missing inputs instead of returning malformed links', () => {
    delete process.env.EXPO_PUBLIC_APP_URL;

    expect(() => url.getInviteUrl('invite-token')).toThrow(
      'EXPO_PUBLIC_APP_URL'
    );

    expect(() => url.getInviteUrl('', 'https://llog.example')).toThrow(
      'Invite token'
    );

    expect(() => url.getInviteUrl('invite-token', '   ')).toThrow(
      'EXPO_PUBLIC_APP_URL'
    );
  });
});
