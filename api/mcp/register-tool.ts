import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod/v4';

type McpToolHandler<Shape extends z.ZodRawShape> = (
  args: z.output<z.ZodObject<Shape>>
) => CallToolResult | Promise<CallToolResult>;

export const registerMcpTool = <
  InputShape extends z.ZodRawShape,
  OutputShape extends z.ZodRawShape,
>(
  server: McpServer,
  name: string,
  config: {
    description: string;
    inputSchema: InputShape;
    outputSchema?: OutputShape;
  },
  handler: McpToolHandler<InputShape>
): ReturnType<McpServer['registerTool']> =>
  server.registerTool(
    name,
    {
      ...config,
      inputSchema: config.inputSchema as never,
      outputSchema: config.outputSchema as never,
    },
    handler as never
  );
