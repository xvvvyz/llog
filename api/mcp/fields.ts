import { mcpFileUrl } from '@/api/mcp/file-urls';
import type * as mcpTypes from '@/api/mcp/types';

type McpFieldOptions = {
  appUrl?: string;
  includeFiles?: boolean;
  includeLinks?: boolean;
  includeReactions?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const compact = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(compact).filter((item) => item !== undefined);
  }

  if (!isRecord(value)) return value;
  const result: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    const next = compact(item);
    if (next == null) continue;

    if (
      next === false &&
      (key.startsWith('is') || key.startsWith('has') || key.startsWith('can'))
    ) {
      continue;
    }

    if (Array.isArray(next) && next.length === 0) continue;
    if (isRecord(next) && Object.keys(next).length === 0) continue;
    if (key === 'success' && next === true) continue;
    result[key] = next;
  }

  return result;
};

const stringifyCompact = (data: unknown) => JSON.stringify(compact(data));

export const textResult = (
  data: Record<string, unknown>,
  markdown?: string
) => {
  const structuredContent = compact(data) as Record<string, unknown>;

  return {
    content: [
      {
        text: markdown?.trim() || stringifyCompact(structuredContent),
        type: 'text' as const,
      },
    ],
    structuredContent,
  };
};

export const table = (
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
) => {
  if (!rows.length) return 'No results.';

  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(
      (row) =>
        `| ${row.map((cell) => String(cell ?? '').replace(/\|/g, '\\|')).join(' | ')} |`
    ),
  ].join('\n');
};

export const textPreview = (text?: string | null, max = 160) => {
  const value = (text ?? '').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trimEnd()}...`;
};

export const fileFields = (
  file: mcpTypes.McpFile,
  options?: McpFieldOptions
) => ({
  duration: file.duration ?? undefined,
  id: file.id,
  mimeType: file.mimeType ?? undefined,
  name: file.name ?? undefined,
  size: file.size ?? undefined,
  thumbnailUri: file.thumbnailUri ?? undefined,
  type: file.type,
  uri: file.uri ?? undefined,
  url: mcpFileUrl(file, options),
});

export const linkFields = (link: mcpTypes.McpLink) => ({
  id: link.id,
  label: link.label,
  order: link.order ?? undefined,
  url: link.url,
});

const byTagOrder = (a: mcpTypes.McpTag, b: mcpTypes.McpTag) =>
  (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name);

export const tagFields = (tag: mcpTypes.McpTag) => ({
  id: tag.id,
  name: tag.name,
  order: tag.order ?? undefined,
});

export const profileFields = (profile?: mcpTypes.McpProfile | null) =>
  profile ? { id: profile.id, name: profile.name } : undefined;

export const reactionCounts = (reactions: mcpTypes.McpReaction[] = []) => {
  const counts = new Map<string, number>();

  for (const reaction of reactions) {
    if (!reaction.emoji) continue;
    counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([emoji, count]) => ({
    count,
    emoji,
  }));
};

export const recordFields = (
  record: mcpTypes.McpRecord,
  options?: McpFieldOptions
) => ({
  author: profileFields(record.author),
  date: record.date,
  fileCount: record.files?.length,
  files: options?.includeFiles
    ? (record.files ?? []).map((file) => fileFields(file, options))
    : undefined,
  id: record.id,
  isDraft: !!record.isDraft,
  isPinned: !!record.isPinned,
  linkCount: record.links?.length,
  links: options?.includeLinks
    ? (record.links ?? []).map(linkFields)
    : undefined,
  log: record.log
    ? { color: record.log.color, id: record.log.id, name: record.log.name }
    : undefined,
  reactionCount: record.reactions?.length,
  reactionCounts: options?.includeReactions
    ? reactionCounts(record.reactions)
    : undefined,
  replyCount: (record.replies ?? []).filter((reply) => !reply.isDraft).length,
  tags: [...(record.tags ?? [])].sort(byTagOrder).map(tagFields),
  teamId: record.teamId,
  text: record.text ?? '',
});

export const replyFields = (
  reply: mcpTypes.McpReply,
  options?: McpFieldOptions
) => ({
  author: profileFields(reply.author),
  date: reply.date,
  fileCount: reply.files?.length,
  files: options?.includeFiles
    ? (reply.files ?? []).map((file) => fileFields(file, options))
    : undefined,
  id: reply.id,
  isDraft: !!reply.isDraft,
  linkCount: reply.links?.length,
  links: options?.includeLinks
    ? (reply.links ?? []).map(linkFields)
    : undefined,
  reactionCount: reply.reactions?.length,
  reactionCounts: options?.includeReactions
    ? reactionCounts(reply.reactions)
    : undefined,
  text: reply.text,
});

export const logFields = (log: mcpTypes.McpLog) => ({
  color: log.color ?? undefined,
  id: log.id,
  name: log.name,
  tags: (log.tags ?? []).map((tag) => ({
    id: tag.id,
    name: tag.name,
    order: tag.order ?? undefined,
  })),
  teamId: log.team?.id ?? log.teamId ?? undefined,
});

export const teamFields = (
  team: Pick<mcpTypes.McpTeam, 'id' | 'name'> & { role?: string | null }
) => ({ id: team.id, name: team.name, role: team.role ?? undefined });

export const recordSummaryFields = (
  record: mcpTypes.McpRecord,
  _options?: McpFieldOptions
) => ({
  date: record.date,
  fileCount: record.files?.length,
  id: record.id,
  isDraft: !!record.isDraft,
  isPinned: !!record.isPinned,
  linkCount: record.links?.length,
  log: record.log ? { id: record.log.id, name: record.log.name } : undefined,
  reactionCount: record.reactions?.length,
  replyCount: (record.replies ?? []).filter((reply) => !reply.isDraft).length,
  tags: [...(record.tags ?? [])].sort(byTagOrder).map(tagFields),
  text: textPreview(record.text),
});

export const replySummaryFields = (
  reply: mcpTypes.McpReply,
  _options?: McpFieldOptions
) => ({
  date: reply.date,
  fileCount: reply.files?.length,
  id: reply.id,
  isDraft: !!reply.isDraft,
  linkCount: reply.links?.length,
  reactionCount: reply.reactions?.length,
  record: reply.record
    ? {
        id: reply.record.id,
        log: reply.record.log
          ? { id: reply.record.log.id, name: reply.record.log.name }
          : undefined,
        tags: [...(reply.record.tags ?? [])].sort(byTagOrder).map(tagFields),
      }
    : undefined,
  text: textPreview(reply.text),
});
