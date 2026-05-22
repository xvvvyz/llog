import { mcpFileUrl } from '@/api/mcp/file-urls';
import type * as mcpTypes from '@/api/mcp/types';
import * as mediaMetadata from '@/domain/files/media-metadata';
import { isRecord } from '@/lib/coerce';

type McpFieldOptions = {
  appUrl?: string;
  includeFiles?: boolean;
  includeLinks?: boolean;
  includeReactions?: boolean;
};

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
type TableCell = string | number | boolean | null | undefined;
const normalizeLineBreaks = (text: string) => text.replace(/\r\n?/g, '\n');

const codeFence = (text: string) => {
  const longestRun = Math.max(
    2,
    ...(text.match(/`+/g) ?? []).map((run) => run.length)
  );

  return '`'.repeat(longestRun + 1);
};

export const textBlock = (label: string, text?: string | null) => {
  if (!text) return undefined;
  const fence = codeFence(text);
  return `${label}:\n${fence}text\n${text}\n${fence}`;
};

const tableCellValue = (cell: TableCell) =>
  normalizeLineBreaks(String(cell ?? ''));

const tableCellText = (cell: TableCell) =>
  tableCellValue(cell).replace(/\|/g, '\\|').replace(/\n/g, ' ');

const hasMultilineTableCell = (rows: TableCell[][]) =>
  rows.some((row) => row.some((cell) => tableCellValue(cell).includes('\n')));

const tableRowBlock = (
  headers: string[],
  row: TableCell[],
  index: number,
  total: number
) =>
  [
    total > 1 ? `Item ${index + 1}` : undefined,
    ...headers.map((header, cellIndex) => {
      const value = tableCellValue(row[cellIndex]);
      if (!value) return `${header}:`;
      if (value.includes('\n')) return textBlock(header, value) ?? `${header}:`;
      return `${header}: ${value}`;
    }),
  ]
    .filter(Boolean)
    .join('\n');

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

export const table = (headers: string[], rows: TableCell[][]) => {
  if (!rows.length) return 'No results.';

  if (hasMultilineTableCell(rows)) {
    return rows
      .map((row, index) => tableRowBlock(headers, row, index, rows.length))
      .join('\n\n');
  }

  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(
      (row) => `| ${row.map((cell) => tableCellText(cell)).join(' | ')} |`
    ),
  ].join('\n');
};

export const textPreview = (text?: string | null, max = 160) => {
  const value = normalizeLineBreaks(text ?? '')
    .replace(/[^\S\n]+/g, ' ')
    .trim();

  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trimEnd()}...`;
};

const dateField = (value: string | number | Date) =>
  value instanceof Date ? value.toISOString() : value;

const appUrl = (path: string, options?: McpFieldOptions) => {
  if (!options?.appUrl) return undefined;

  try {
    return new URL(path, options.appUrl).toString();
  } catch {
    return undefined;
  }
};

export const recordUrl = (recordId: string, options?: McpFieldOptions) =>
  appUrl(`/records/${encodeURIComponent(recordId)}`, options);

export const fileFields = (
  file: mcpTypes.McpFile,
  options?: McpFieldOptions
) => {
  const tracks = mediaMetadata.parseStoredTracks(file.tracks);

  const transcript = mediaMetadata.parseStoredTranscriptSegments(
    file.transcript
  );

  return {
    assetKey: file.assetKey ?? undefined,
    duration: file.duration ?? undefined,
    id: file.id,
    mimeType: file.mimeType ?? undefined,
    name: file.name ?? undefined,
    size: file.size ?? undefined,
    thumbnailUri: file.thumbnailUri ?? undefined,
    trackCount: file.tracks != null ? tracks.length : undefined,
    tracks: file.tracks != null ? tracks : undefined,
    transcript: file.transcript != null ? transcript : undefined,
    transcriptSegmentCount:
      file.transcript != null ? transcript.length : undefined,
    type: file.type,
    uri: file.uri ?? undefined,
    url: mcpFileUrl(file, options),
  };
};

const linkFields = (link: mcpTypes.McpLink) => ({
  id: link.id,
  label: link.label,
  order: link.order ?? undefined,
  url: link.url,
});

export const tagFields = (tag: mcpTypes.McpTag) => ({
  id: tag.id,
  name: tag.name,
  order: tag.order ?? undefined,
});

export const profileFields = (profile?: mcpTypes.McpProfile | null) =>
  profile ? { id: profile.id, name: profile.name } : undefined;

export const recordRefFields = (
  record: Pick<mcpTypes.McpRecord, 'id' | 'log' | 'tags'>,
  options?: McpFieldOptions
) => ({
  id: record.id,
  log: record.log ? { id: record.log.id, name: record.log.name } : undefined,
  tags: (record.tags ?? []).map(tagFields),
  url: recordUrl(record.id, options),
});

const reactionCounts = (reactions: mcpTypes.McpReaction[] = []) => {
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
  date: dateField(record.date),
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
  log: record.log ? { id: record.log.id, name: record.log.name } : undefined,
  reactionCount: record.reactions?.length,
  reactionCounts: options?.includeReactions
    ? reactionCounts(record.reactions)
    : undefined,
  replyCount: (record.replies ?? []).filter((reply) => !reply.isDraft).length,
  tags: (record.tags ?? []).map(tagFields),
  teamId: record.teamId,
  text: record.text ?? '',
  url: recordUrl(record.id, options),
});

export const replyFields = (
  reply: mcpTypes.McpReply,
  options?: McpFieldOptions
) => ({
  author: profileFields(reply.author),
  date: dateField(reply.date),
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
  id: log.id,
  name: log.name,
  tags: (log.tags ?? []).map((tag) => ({
    id: tag.id,
    name: tag.name,
    order: tag.order ?? undefined,
  })),
  teamId: log.team?.id ?? log.teamId ?? undefined,
});

export const templateFields = (template: mcpTypes.McpTemplate) => ({
  id: template.id,
  log: template.log
    ? {
        id: template.log.id,
        name: template.log.name,
        teamId: template.log.teamId ?? undefined,
      }
    : undefined,
  tags: (template.tags ?? []).map(tagFields),
  teamId: template.teamId ?? undefined,
  text: template.text,
});

export const teamFields = (
  team: Pick<mcpTypes.McpTeam, 'id' | 'name'> & { role?: string | null }
) => ({ id: team.id, name: team.name, role: team.role ?? undefined });

export const recordSummaryFields = (
  record: mcpTypes.McpRecord,
  options?: McpFieldOptions
) => ({
  date: dateField(record.date),
  fileCount: record.files?.length,
  id: record.id,
  isDraft: !!record.isDraft,
  isPinned: !!record.isPinned,
  linkCount: record.links?.length,
  log: record.log ? { id: record.log.id, name: record.log.name } : undefined,
  reactionCount: record.reactions?.length,
  replyCount: (record.replies ?? []).filter((reply) => !reply.isDraft).length,
  tags: (record.tags ?? []).map(tagFields),
  text: textPreview(record.text),
  url: recordUrl(record.id, options),
});

export const replySummaryFields = (
  reply: mcpTypes.McpReply,
  options?: McpFieldOptions
) => ({
  date: dateField(reply.date),
  fileCount: reply.files?.length,
  id: reply.id,
  isDraft: !!reply.isDraft,
  linkCount: reply.links?.length,
  reactionCount: reply.reactions?.length,
  record: reply.record ? recordRefFields(reply.record, options) : undefined,
  text: textPreview(reply.text),
});
