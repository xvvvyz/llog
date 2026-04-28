import { linkInputSchema } from '@/api/mcp/schemas';
import type { McpContext, McpLink } from '@/api/mcp/types';
import { id } from '@instantdb/admin';
import type { z } from 'zod/v4';

type LinkInput = z.infer<typeof linkInputSchema>;

export const replaceLinkTransactions = ({
  db,
  existingLinks = [],
  links,
  target,
  targetId,
  teamId,
}: {
  db: McpContext['db'];
  existingLinks?: McpLink[];
  links: LinkInput[];
  target: 'record' | 'reply';
  targetId: string;
  teamId: string;
}) => {
  const linkTarget =
    target === 'record' ? { record: targetId } : { reply: targetId };

  return [
    ...existingLinks.map((link) => db.tx.links[link.id].delete()),
    ...links.map((link, order) =>
      db.tx.links[id()]
        .update({ label: link.label.trim(), order, teamId, url: link.url })
        .link(linkTarget)
    ),
  ];
};
