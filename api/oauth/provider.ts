import { mcpHandler } from '@/api/mcp';
import { LLOG_OAUTH_SCOPES } from '@/api/oauth/scopes';
import { OAuthProvider } from '@cloudflare/workers-oauth-provider';

export const createOAuthProvider = (
  defaultHandler: ExportedHandler<CloudflareEnv>
) =>
  new OAuthProvider<CloudflareEnv>({
    accessTokenTTL: 60 * 60,
    allowPlainPKCE: false,
    apiHandler: mcpHandler,
    apiRoute: '/mcp',
    authorizeEndpoint: '/authorize',
    clientRegistrationEndpoint: '/api/v1/oauth/register',
    defaultHandler,
    refreshTokenTTL: 60 * 60 * 24 * 30,
    resourceMetadata: {
      bearer_methods_supported: ['header'],
      resource_name: 'llog MCP',
      scopes_supported: LLOG_OAUTH_SCOPES,
    },
    scopesSupported: LLOG_OAUTH_SCOPES,
    tokenEndpoint: '/api/v1/oauth/token',
  });

export const normalizePublicOrigin = (request: Request, appUrl: string) => {
  const publicUrl = new URL(appUrl);
  const requestUrl = new URL(request.url);
  if (requestUrl.origin === publicUrl.origin) return request;
  requestUrl.protocol = publicUrl.protocol;
  requestUrl.host = publicUrl.host;
  return new Request(requestUrl, request);
};
