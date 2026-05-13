import { handleAuthorizationCodeReplay } from '@/api/oauth/authorization-code-replay';
import { describe, expect, test } from 'bun:test';

const tokenRequest = () =>
  new Request('https://x.llog.app/api/v1/oauth/token', {
    body: new URLSearchParams({
      client_id: 'client-1',
      code: 'user:grant:secret',
      code_veribazr: 'veribazr',
      grant_type: 'authorization_code',
      redirect_uri: 'https://chatgpt.com/callback',
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });

const createEnv = () => {
  const values = new Map<string, string>();

  return {
    OAUTH_KV: {
      get: async (key: string) => values.get(key) ?? null,
      put: async (key: string, value: string) => {
        values.set(key, value);
      },
    },
  } as unknown as CloudflareEnv;
};

describe('handleAuthorizationCodeReplay', () => {
  test('replays token responses', async () => {
    const env = createEnv();
    let calls = 0;

    const first = await handleAuthorizationCodeReplay(
      tokenRequest(),
      env,
      async () => {
        calls += 1;

        return Response.json({
          access_token: 'access-token',
          token_type: 'bearer',
        });
      }
    );

    const second = await handleAuthorizationCodeReplay(
      tokenRequest(),
      env,
      async () => {
        calls += 1;

        return Response.json(
          { error: 'authorization code already used' },
          { status: 400 }
        );
      }
    );

    await expect(first.json()).resolves.toMatchObject({
      access_token: 'access-token',
    });

    await expect(second.json()).resolves.toMatchObject({
      access_token: 'access-token',
    });

    expect(calls).toBe(1);
  });
});
