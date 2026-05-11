import * as mcpFields from '@/api/mcp/fields';
import { registerMcpTool } from '@/api/mcp/register-tool';
import * as mcpSchemas from '@/api/mcp/schemas';
import type { McpContext } from '@/api/mcp/types';
import { getViewer } from '@/api/mcp/viewer';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const registerAccountTool = (server: McpServer, ctx: McpContext) => {
  registerMcpTool(
    server,
    'account',
    {
      description: 'Account.',
      inputSchema: {},
      outputSchema: mcpSchemas.accountOutputSchema,
    },
    async () => {
      const viewer = await getViewer(ctx.db, ctx.props.userId);

      const data = {
        email: ctx.props.email,
        profile: mcpFields.profileFields(viewer.profile),
        teams: viewer.teams.map(mcpFields.teamFields),
        userId: ctx.props.userId,
      };

      return mcpFields.textResult(
        data,
        [
          `User: ${viewer.profile?.name ?? ctx.props.email ?? ctx.props.userId}`,
          `ID: ${ctx.props.userId}`,
          mcpFields.table(
            ['Team', 'Role', 'ID'],
            data.teams.map((team) => [team.name, team.role, team.id])
          ),
        ].join('\n\n')
      );
    }
  );
};
