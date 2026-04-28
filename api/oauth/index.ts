import { auth, db } from '@/api/middleware/db';
import { LLOG_OAUTH_SCOPES } from '@/api/oauth/scopes';
import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

type OAuthEnv = CloudflareEnv & { OAUTH_PROVIDER: OAuthHelpers };
const app = new Hono<{ Bindings: OAuthEnv }>();

const getOrigin = (request: Request) => {
  const url = new URL(request.url);
  return url.origin;
};

const getAuthorizeRequest = (request: Request, query: string) =>
  new Request(`${getOrigin(request)}/authorize?${query}`, {
    headers: request.headers,
    method: 'GET',
  });

const parseAuthorizeRequest = async (
  env: OAuthEnv,
  request: Request,
  query: string
) => {
  if (!query) throw new HTTPException(400, { message: 'Invalid request' });

  try {
    return await env.OAUTH_PROVIDER.parseAuthRequest(
      getAuthorizeRequest(request, query)
    );
  } catch {
    throw new HTTPException(400, { message: 'Invalid authorization request' });
  }
};

app.get('/authorize/preview', async (c) => {
  const query = c.req.url.split('?')[1] ?? '';
  const request = await parseAuthorizeRequest(c.env, c.req.raw, query);
  const client = await c.env.OAUTH_PROVIDER.lookupClient(request.clientId);

  return c.json({
    client: client
      ? {
          clientId: client.clientId,
          clientName: client.clientName,
          clientUri: client.clientUri,
          logoUri: client.logoUri,
        }
      : null,
    request: {
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      scope: LLOG_OAUTH_SCOPES,
    },
  });
});

app.post(
  '/authorize/complete',
  db(),
  auth(),
  zValidator('json', z.object({ query: z.string().min(1) })),
  async (c) => {
    const user = c.var.user;
    const { query } = c.req.valid('json');

    const [{ profiles }, request] = await Promise.all([
      c.var.db.query({
        profiles: {
          $: { where: { user: user.id } },
          image: {},
          user: { $: { fields: ['id', 'email'] } },
        },
      }),
      parseAuthorizeRequest(c.env, c.req.raw, query),
    ]);

    const profile = profiles[0];

    if (!profile) {
      throw new HTTPException(403, { message: 'Profile not found' });
    }

    const client = await c.env.OAUTH_PROVIDER.lookupClient(request.clientId);
    if (!client) throw new HTTPException(400, { message: 'Invalid client' });

    const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
      metadata: {
        clientName: client.clientName,
        clientUri: client.clientUri,
        logoUri: client.logoUri,
      },
      props: { email: user.email, profileId: profile.id, userId: user.id },
      request,
      scope: LLOG_OAUTH_SCOPES,
      userId: user.id,
    });

    return c.json({ redirectTo });
  }
);

app.get('/grants', db(), auth(), async (c) => {
  const grants = [];
  let cursor: string | undefined;

  do {
    const page = await c.env.OAUTH_PROVIDER.listUserGrants(c.var.user.id, {
      cursor,
      limit: 100,
    });

    grants.push(...page.items);
    cursor = page.cursor;
  } while (cursor);

  return c.json({
    grants: grants.map((grant) => ({
      clientId: grant.clientId,
      createdAt: grant.createdAt,
      expiresAt: grant.expiresAt,
      id: grant.id,
      metadata: grant.metadata,
      scope: grant.scope,
    })),
  });
});

app.delete('/grants/:grantId', db(), auth(), async (c) => {
  const grantId = c.req.param('grantId');
  if (!grantId) throw new HTTPException(400, { message: 'Invalid request' });
  await c.env.OAUTH_PROVIDER.revokeGrant(grantId, c.var.user.id);
  return c.json({ success: true });
});

export default app;
