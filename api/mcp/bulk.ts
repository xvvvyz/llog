import * as mcpFields from '@/api/mcp/fields';

type McpTextResult = ReturnType<typeof mcpFields.textResult>;

export const requireItems = <Item>(
  items: Item[] | undefined,
  action: string
) => {
  if (!items?.length) throw new Error(`items is required for ${action}`);
  return items;
};

export const runBulkItems = async <Item>({
  action,
  handler,
  items,
  resultKey = 'results',
}: {
  action: string;
  handler: (
    item: Item,
    index: number
  ) => McpTextResult | Promise<McpTextResult>;
  items?: Item[];
  resultKey?: string;
}) => {
  const requiredItems = requireItems(items, action);
  const results: Record<string, unknown>[] = [];
  const text: string[] = [];

  for (const [index, item] of requiredItems.entries()) {
    const result = await Promise.resolve(handler(item, index)).catch(
      (error) => {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`items[${index}]: ${message}`);
      }
    );

    results.push(result.structuredContent);

    const itemText = result.content
      .map((content) => (content.type === 'text' ? content.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim();

    text.push(
      requiredItems.length === 1 ? itemText : `Item ${index + 1}\n\n${itemText}`
    );
  }

  return mcpFields.textResult({ [resultKey]: results }, text.join('\n\n'));
};
