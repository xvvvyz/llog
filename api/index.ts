import files from '@/api/files';
import internal from '@/api/internal';
import { installConsoleErrorSerializer } from '@/api/lib/logging';
import logs from '@/api/logs';
import { headers } from '@/api/middleware/headers';
import oauth from '@/api/oauth';
import { handleAuthorizationCodeReplay } from '@/api/oauth/authorization-code-replay';
import * as oauthProviderModule from '@/api/oauth/provider';
import push from '@/api/push';
import records from '@/api/records';
import teams from '@/api/teams';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

installConsoleErrorSerializer();
const api = new Hono().basePath('/api/v1');
api.use(headers());
api.get('/health', (c) => c.text('ok'));
api.route('/files', files);
api.route('/internal', internal);
api.route('/logs', logs);
api.route('/oauth', oauth);
api.route('/push', push);
api.route('/records', records);
api.route('/teams', teams);

api.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();

  console.error('Unhandled API error', {
    path: c.req.path,
    method: c.req.method,
    error: err,
  });

  return c.json({ message: 'Internal server error' }, 500);
});

const defaultHandler = {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/v1/')) {
      return api.fetch(request, env, ctx);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};

const oauthProvider = oauthProviderModule.createOAuthProvider(defaultHandler);

export default {
  fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    const normalizedRequest = oauthProviderModule.normalizePublicOrigin(
      request,
      env.APP_URL
    );

    return handleAuthorizationCodeReplay(
      normalizedRequest,
      env,
      (nextRequest) => oauthProvider.fetch(nextRequest, env, ctx)
    );
  },
};
