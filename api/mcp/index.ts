import { registerAccountTool } from '@/api/mcp/account';
import { registerActionTools } from '@/api/mcp/actions';
import { MCP_SERVER_INSTRUCTIONS } from '@/api/mcp/instructions';
import { registerLogTools } from '@/api/mcp/logs';
import { registerRecordTools } from '@/api/mcp/records';
import { registerReplyTools } from '@/api/mcp/replies';
import { registerResources } from '@/api/mcp/resources';
import { registerSearchTool } from '@/api/mcp/search';
import { registerTagTools } from '@/api/mcp/tags';
import type { McpContext, OAuthProps } from '@/api/mcp/types';
import { createAdminDb } from '@/api/middleware/db';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpHandler } from 'agents/mcp';

const createServer = (ctx: McpContext) => {
  const appUrl = new URL(ctx.env.APP_URL).origin;

  const server = new McpServer(
    {
      description: 'Capture, search, and manage personal and team records.',
      icons: [
        {
          mimeType: 'image/png',
          sizes: ['192x192'],
          src: `${appUrl}/icon-192.png`,
        },
        {
          mimeType: 'image/png',
          sizes: ['512x512'],
          src: `${appUrl}/icon-512.png`,
        },
      ],
      name: 'llog',
      title: 'llog',
      version: '0.0.1',
      websiteUrl: appUrl,
    },
    { instructions: MCP_SERVER_INSTRUCTIONS }
  );

  registerAccountTool(server, ctx);
  registerSearchTool(server, ctx);
  registerLogTools(server, ctx);
  registerRecordTools(server, ctx);
  registerReplyTools(server, ctx);
  registerTagTools(server, ctx);
  registerActionTools(server, ctx);
  registerResources(server, ctx);
  return server;
};

export const mcpHandler = {
  fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    const props = ctx.props as OAuthProps | undefined;

    if (!props?.userId || !props.profileId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const server = createServer({ db: createAdminDb(env), env, props });
    return createMcpHandler(server)(request, env, ctx);
  },
};
