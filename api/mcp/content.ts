import type { McpContext, McpLog, McpRecord, McpReply } from '@/api/mcp/types';
import { getViewer } from '@/api/mcp/viewer';
import { notificationRecipientLogQuery } from '@/api/push/query';
import * as contentQueries from '@/api/mcp/content-queries';
import * as recordStatus from '@/domain/records/status';

type ReadOptions = { query?: object };

type McpReplyWithRecord = McpReply & {
  record?: Pick<McpRecord, 'id' | 'tags' | 'teamId'> & { log?: McpLog };
};

export const recordIdFromUrl = (recordUrl?: string) => {
  if (!recordUrl) return undefined;

  try {
    const url = new URL(recordUrl);
    const [, resource, recordId] = url.pathname.split('/');

    return resource === 'records' && recordId
      ? decodeURIComponent(recordId)
      : undefined;
  } catch {
    return undefined;
  }
};

export const hasLinkedContent = ({
  files,
  links,
  text,
}: {
  files?: unknown[];
  links?: unknown[];
  text?: string | null;
}) => !!text?.trim() || !!files?.length || !!links?.length;

export const getVisibleRecord = async (
  ctx: McpContext,
  recordId: string,
  { query }: ReadOptions = {}
) => {
  const queryShape = query ?? contentQueries.recordReadQuery;

  const [{ records }, viewer] = await Promise.all([
    ctx.db.query({
      records: {
        $: { where: { id: recordId, status: 'published' } },
        ...(queryShape as typeof contentQueries.recordReadQuery),
      },
    }) as Promise<{ records?: McpRecord[] }>,
    getViewer(ctx.db, ctx.props.userId),
  ]);

  const record = records?.[0];
  if (!record?.log?.id) throw new Error('Record not found or not visible');
  return { record, viewer };
};

export const getCallerDraftRecord = async (
  ctx: McpContext,
  recordId: string,
  { query }: ReadOptions = {}
) => {
  const queryShape = query ?? contentQueries.recordReadQuery;

  const [{ records }, viewer] = await Promise.all([
    ctx.db.query({
      records: {
        $: { where: { id: recordId, status: 'draft' } },
        ...(queryShape as typeof contentQueries.recordReadQuery),
      },
    }) as Promise<{ records?: McpRecord[] }>,
    getViewer(ctx.db, ctx.props.userId),
  ]);

  const record = records?.[0];

  if (
    !record?.log?.id ||
    !viewer.profile?.id ||
    record.author?.id !== viewer.profile.id
  ) {
    throw new Error('Draft record not found or not visible');
  }

  return { record, viewer };
};

export const getReadableRecord = async (
  ctx: McpContext,
  recordId: string,
  { query }: ReadOptions = {}
) => {
  const queryShape = query ?? contentQueries.recordReadQuery;

  const [{ records }, viewer] = await Promise.all([
    ctx.db.query({
      records: {
        $: { where: { id: recordId } },
        ...(queryShape as typeof contentQueries.recordReadQuery),
      },
    }) as Promise<{ records?: McpRecord[] }>,
    getViewer(ctx.db, ctx.props.userId),
  ]);

  const record = records?.[0];
  if (!record?.log?.id) throw new Error('Record not found or not visible');

  if (
    recordStatus.recordIsUnpublished(record) &&
    (!viewer.profile?.id || record.author?.id !== viewer.profile.id)
  ) {
    throw new Error('Record not found or not visible');
  }

  return { record, viewer };
};

export const getCallerDraftReply = async (
  ctx: McpContext,
  replyId: string,
  { query }: ReadOptions = {}
) => {
  const queryShape = query ?? contentQueries.replyDraftReadQuery;

  const [{ replies }, viewer] = await Promise.all([
    ctx.db.query({
      replies: {
        $: { where: { id: replyId, isDraft: true } },
        ...(queryShape as typeof contentQueries.replyDraftReadQuery),
      },
    }) as Promise<{ replies?: McpReplyWithRecord[] }>,
    getViewer(ctx.db, ctx.props.userId),
  ]);

  const reply = replies?.[0];

  if (
    !reply?.record?.id ||
    !reply.record.log?.id ||
    !viewer.profile?.id ||
    reply.author?.id !== viewer.profile.id
  ) {
    throw new Error('Draft reply not found or not visible');
  }

  return { reply, viewer };
};

export const getReadableReply = async (
  ctx: McpContext,
  replyId: string,
  { query }: ReadOptions = {}
) => {
  const queryShape = query ?? contentQueries.replyReadQuery;

  const [{ replies }, viewer] = await Promise.all([
    ctx.db.query({
      replies: {
        $: { where: { id: replyId } },
        ...(queryShape as typeof contentQueries.replyReadQuery),
      },
    }) as Promise<{ replies?: McpReplyWithRecord[] }>,
    getViewer(ctx.db, ctx.props.userId),
  ]);

  const reply = replies?.[0];

  if (!reply?.record?.log?.id) {
    throw new Error('Reply not found or not visible');
  }

  if (
    reply.isDraft &&
    (!viewer.profile?.id || reply.author?.id !== viewer.profile.id)
  ) {
    throw new Error('Reply not found or not visible');
  }

  return { reply, viewer };
};

export const getPublishedReplyCount = async (
  ctx: McpContext,
  recordId: string
) => {
  const { replies } = (await ctx.db.query({
    replies: {
      $: {
        fields: ['id' as const],
        where: { isDraft: { $not: true }, record: recordId },
      },
    },
  })) as { replies?: { id: string }[] };

  return replies?.length ?? 0;
};

export const getNotificationLog = async (ctx: McpContext, logId: string) => {
  const { logs } = (await ctx.notificationDb.query({
    logs: {
      $: {
        fields: ['id' as const, 'name' as const, 'teamId' as const],
        where: { id: logId },
      },
      ...notificationRecipientLogQuery,
    },
  })) as { logs?: McpLog[] };

  const log = logs?.[0];
  if (!log?.id) throw new Error('Notification log not found');
  return log;
};
