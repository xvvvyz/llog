import * as mcpFields from '@/api/mcp/fields';
import { getReadableRecord } from '@/api/mcp/records';
import { getReadableReply } from '@/api/mcp/replies';
import type { McpContext } from '@/api/mcp/types';

import {
  ResourceTemplate,
  type McpServer,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const variableValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const jsonResource = (uri: URL, data: Record<string, unknown>) => ({
  contents: [
    {
      mimeType: 'application/json',
      text: JSON.stringify(mcpFields.compact(data), null, 2),
      uri: uri.href,
    },
  ],
});

export const registerResources = (server: McpServer, ctx: McpContext) => {
  const fieldOptions = {
    appUrl: ctx.env.APP_URL,
    includeFiles: true,
    includeLinks: true,
    includeReactions: true,
  };

  server.registerResource(
    'record',
    new ResourceTemplate('llog://record/{recordId}', { list: undefined }),
    {
      description: 'Full record detail as JSON.',
      mimeType: 'application/json',
      title: 'Record',
    },
    async (uri, variables) => {
      const recordId = variableValue(variables.recordId);
      if (!recordId) throw new Error('recordId is required');
      const { record } = await getReadableRecord(ctx, recordId);

      const item = {
        ...mcpFields.recordFields(record, fieldOptions),
        replies: (record.replies ?? []).map((reply) =>
          mcpFields.replyFields(reply, fieldOptions)
        ),
      };

      return jsonResource(uri, { record: item });
    }
  );

  server.registerResource(
    'reply',
    new ResourceTemplate('llog://reply/{replyId}', { list: undefined }),
    {
      description: 'Full reply detail as JSON.',
      mimeType: 'application/json',
      title: 'Reply',
    },
    async (uri, variables) => {
      const replyId = variableValue(variables.replyId);
      if (!replyId) throw new Error('replyId is required');
      const { reply } = await getReadableReply(ctx, replyId);
      const record = reply.record;

      const item = {
        ...mcpFields.replyFields(reply, fieldOptions),
        record: record
          ? mcpFields.recordRefFields(record, fieldOptions)
          : undefined,
      };

      return jsonResource(uri, { reply: item });
    }
  );
};
