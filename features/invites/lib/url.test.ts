import * as url from '@/features/invites/lib/url';
import { afterEach, describe, expect, test } from 'bun:test';

const originalAppUrl = process.env.EXPO_PUBLIC_APP_URL;

afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.EXPO_PUBLIC_APP_URL;
    return;
  }

  process.env.EXPO_PUBLIC_APP_URL = originalAppUrl;
});

describe('getInviteUrl', () => {
  test('builds invite URLs', () => {
    process.env.EXPO_PUBLIC_APP_URL = 'https://llog.example';

    expect(url.getInviteUrl('invite-token')).toBe(
      'https://llog.example/join/invite-token'
    );
  });

  test('normalizes invite URLs', () => {
    expect(url.getInviteUrl('team/a b', ' https://llog.example/// ')).toBe(
      'https://llog.example/join/team%2Fa%20b'
    );
  });

  test('rejects invalid invite URLs', () => {
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
