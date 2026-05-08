const TOKEN_ENDPOINT_PATH = '/api/v1/oauth/token';
const AUTH_CODE_REPLAY_TTL_SECONDS = 60;

const hexDigest = async (value: string) => {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  );

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const authorizationCodeCacheKey = async (request: Request) => {
  const url = new URL(request.url);
  const contentType = request.headers.get('Content-Type') ?? '';

  if (
    request.method !== 'POST' ||
    url.pathname !== TOKEN_ENDPOINT_PATH ||
    !contentType.includes('application/x-www-form-urlencoded')
  ) {
    return;
  }

  const params = new URLSearchParams(await request.clone().text());
  if (params.get('grant_type') !== 'authorization_code') return;
  const code = params.get('code');
  if (!code) return;

  const material = JSON.stringify({
    authorization: request.headers.get('Authorization') ?? '',
    clientId: params.get('client_id') ?? '',
    code,
    codeVerifier: params.get('code_verifier') ?? '',
    redirectUri: params.get('redirect_uri') ?? '',
    resource: params.getAll('resource').sort(),
    scope: params.get('scope') ?? '',
  });

  return `oauth:authorization-code-response:${await hexDigest(material)}`;
};

const replayResponse = (body: string, request: Request) => {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  });

  const origin = request.headers.get('Origin');

  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', '*');
    headers.set('Access-Control-Allow-Headers', 'Authorization, *');
    headers.set('Access-Control-Max-Age', '86400');
  }

  return new Response(body, { headers });
};

export const handleAuthorizationCodeReplay = async (
  request: Request,
  env: CloudflareEnv,
  next: (request: Request) => Promise<Response>
) => {
  const cacheKey = await authorizationCodeCacheKey(request);
  if (!cacheKey) return next(request);
  const cached = await env.OAUTH_KV.get(cacheKey);
  if (cached) return replayResponse(cached, request);
  const response = await next(request);

  if (response.ok) {
    const body = await response.clone().text();

    try {
      const data = JSON.parse(body) as { access_token?: unknown };

      if (typeof data.access_token === 'string') {
        await env.OAUTH_KV.put(cacheKey, body, {
          expirationTtl: AUTH_CODE_REPLAY_TTL_SECONDS,
        });
      }
    } catch {}
  }

  return response;
};
