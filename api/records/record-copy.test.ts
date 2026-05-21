import { describe, expect, test } from 'bun:test';
import { HTTPException } from 'hono/http-exception';
import * as recordCopy from '@/api/records/record-copy';
import { Role } from '@/domain/teams/role';

type Transaction = {
  entity: string;
  fields?: Record<string, unknown>;
  id: string;
  links?: Record<string, string>;
};

const entityTx = (entity: string) =>
  new Proxy(
    {},
    {
      get: (_target, id: string) => ({
        delete: () => ({ entity, id, type: 'delete' }),
        link: (links: Record<string, string>) => ({ entity, id, links }),
        update: (fields: Record<string, unknown>) => {
          const transaction = { entity, fields, id };

          return {
            ...transaction,
            link: (links: Record<string, string>) => ({
              ...transaction,
              links,
            }),
          };
        },
      }),
    }
  );

describe('copy targets', () => {
  test('normalizes ids', () => {
    expect(
      recordCopy.normalizeTargetLogIds([' log-a ', 'log-b', 'log-a'])
    ).toEqual(['log-a', 'log-b']);
  });

  test('rejects blank ids', () => {
    expect(() => recordCopy.normalizeTargetLogIds(['log-a', '  '])).toThrow(
      HTTPException
    );
  });
});

describe('copy payloads', () => {
  test('clones files', () => {
    expect(
      recordCopy.getClonedFileData(
        {
          assetKey: 'records/record-1/file.jpg',
          mimeType: 'image/jpeg',
          name: 'file.jpg',
          order: 1.6,
          type: 'image',
        },
        3
      )
    ).toEqual({
      assetKey: 'records/record-1/file.jpg',
      mimeType: 'image/jpeg',
      name: 'file.jpg',
      order: 2,
      type: 'image',
    });
  });

  test('clones links', () => {
    expect(
      recordCopy.getClonedLinkData(
        { label: 'Docs', url: 'https://example.com' },
        'team-1',
        4
      )
    ).toEqual({
      label: 'Docs',
      order: 4,
      teamId: 'team-1',
      url: 'https://example.com',
    });
  });
});

describe('copy draft team', () => {
  test('uses single target team', () => {
    expect(
      recordCopy.getCopyDraftTeamId({
        sourceTeamId: 'team-source',
        targetLogs: [
          { id: 'log-a', teamId: 'team-target' },
          { id: 'log-b', teamId: 'team-target' },
        ],
      })
    ).toBe('team-target');
  });

  test('keeps source team', () => {
    expect(
      recordCopy.getCopyDraftTeamId({
        sourceTeamId: 'team-source',
        targetLogs: [
          { id: 'log-a', teamId: 'team-a' },
          { id: 'log-b', teamId: 'team-b' },
        ],
      })
    ).toBe('team-source');
  });
});

describe('finalize copy', () => {
  test('refreshes cards', async () => {
    const transactions: Transaction[] = [];
    const sent: { body: unknown; options?: QueueSendOptions }[] = [];

    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('records' in query) {
          return {
            records: [
              {
                author: { id: 'profile-1', user: { id: 'user-1' } },
                files: [],
                id: 'draft-record',
                isDraft: true,
                links: [],
                tags: [
                  {
                    id: 'target-tag',
                    logs: [{ id: 'target-log' }],
                    type: 'record',
                  },
                ],
                teamId: 'team-1',
                text: 'Copied record',
              },
            ],
          };
        }

        if ('roles' in query) return { roles: [{ id: 'role-1' }] };

        if ('logs' in query) {
          return {
            logs: [
              {
                id: 'target-log',
                profiles: [{ user: { id: 'user-1' } }],
                team: { roles: [{ role: Role.Member }] },
                teamId: 'team-1',
              },
            ],
          };
        }

        if ('cards' in query) {
          return { cards: [{ id: 'card-1', tags: [{ id: 'target-tag' }] }] };
        }

        return {};
      },
      transact: async (transaction: Transaction | Transaction[]) => {
        transactions.push(
          ...(Array.isArray(transaction) ? transaction : [transaction])
        );
      },
      tx: {
        activities: entityTx('activities'),
        cards: entityTx('cards'),
        files: entityTx('files'),
        links: entityTx('links'),
        records: entityTx('records'),
      },
    };

    const env = {
      JOBS_QUEUE: {
        send: async (body: unknown, options?: QueueSendOptions) => {
          sent.push({ body, options });

          return {
            metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
          };
        },
      } as Queue,
    } as CloudflareEnv;

    await recordCopy.finalizeRecordCopy({
      dbClient: db as never,
      draftRecordId: 'draft-record',
      env,
      logIds: ['target-log'],
      userId: 'user-1',
    });

    const cardUpdate = transactions.find(
      (transaction) =>
        transaction.entity === 'cards' &&
        transaction.fields?.isGenerating === true
    );

    expect(cardUpdate).toMatchObject({
      entity: 'cards',
      id: 'card-1',
      fields: { error: '', isGenerating: true },
    });

    expect(sent[0]).toMatchObject({
      body: {
        cardId: 'card-1',
        requestedAt: cardUpdate?.fields?.generationRequestedAt,
        schemaVersion: 1,
        type: 'card.refresh',
      },
      options: { delaySeconds: 10 },
    });
  });
});
