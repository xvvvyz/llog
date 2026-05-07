import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod/v4';

type McpToolHandler<Shape extends z.ZodRawShape> = (
  args: z.output<z.ZodObject<Shape>>
) => CallToolResult | Promise<CallToolResult>;

export const registerMcpTool = <Shape extends z.ZodRawShape>(
  server: McpServer,
  name: string,
  config: { description: string; inputSchema: Shape },
  handler: McpToolHandler<Shape>
): ReturnType<McpServer['registerTool']> =>
  server.registerTool(
    name,
    { ...config, inputSchema: config.inputSchema as never },
    handler as never
  );
