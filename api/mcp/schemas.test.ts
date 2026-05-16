import * as mcpFields from '@/api/mcp/fields';
import * as mcpSchemas from '@/api/mcp/schemas';
import { describe, expect, test } from 'bun:test';
import { z } from 'zod/v4';

const appUrl = 'https://llog.example';
const profile = { id: 'profile-1', name: 'Person' };

const log = {
  id: 'log-1',
  name: 'Daily',
  tags: [{ id: 'log-tag-1', name: 'Journal' }],
};

const record = {
  author: profile,
  date: '2026-01-02T03:04:05.000Z',
  files: [
    {
      id: 'file-1',
      name: 'note.txt',
      type: 'document',
      uri: 'https://example.com/note.txt',
    },
  ],
  id: 'record-1',
  links: [{ id: 'link-1', label: 'Example', url: 'https://example.com' }],
  log,
  reactions: [{ author: profile, emoji: 'like', id: 'reaction-1' }],
  replies: [
    {
      author: profile,
      date: '2026-01-02T04:04:05.000Z',
      id: 'reply-1',
      text: 'Reply',
    },
  ],
  tags: [{ id: 'tag-1', name: 'Work', order: 1 }],
  teamId: 'team-1',
  text: 'Record',
};

const parseShape = (shape: z.ZodRawShape, data: Record<string, unknown>) =>
  z.object(shape).parse(mcpFields.compact(data));

describe('output schemas', () => {
  test('accepts record fields', () => {
    const item = {
      ...mcpFields.recordFields(record, {
        appUrl,
        includeFiles: true,
        includeLinks: true,
        includeReactions: true,
      }),
      replies: record.replies.map((reply) =>
        mcpFields.replySummaryFields(reply)
      ),
    };

    expect(() =>
      parseShape(mcpSchemas.recordsOutputSchema, { record: item })
    ).not.toThrow();
  });

  test('accepts reply fields', () => {
    const [reply] = record.replies;

    const item = {
      ...mcpFields.replyFields(
        {
          ...reply,
          files: record.files,
          links: record.links,
          reactions: record.reactions,
        },
        {
          appUrl,
          includeFiles: true,
          includeLinks: true,
          includeReactions: true,
        }
      ),
      record: mcpFields.recordRefFields(record, { appUrl }),
    };

    expect(() =>
      parseShape(mcpSchemas.repliesOutputSchema, { reply: item })
    ).not.toThrow();
  });
});
