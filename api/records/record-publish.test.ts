import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { Role } from '@/domain/teams/role';

const scheduleCalls: unknown[] = [];
const cancelCalls: unknown[] = [];

const scheduleRecordPublish = mock(async (env: unknown, payload: unknown) => {
  scheduleCalls.push({ env, payload });
  return { scheduleId: `schedule-${scheduleCalls.length}` };
});

const cancelRecordPublishSchedules = mock(
  async (env: unknown, recordId: string, options?: unknown) => {
    cancelCalls.push({ env, options, recordId });
    return { canceled: 1 };
  }
);

mock.module('@/api/records/record-scheduler', () => ({
  cancelRecordPublishSchedules,
  scheduleRecordPublish,
}));

const recordPublish = await import('@/api/records/record-publish');

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

const scheduledRecord = (date = '2026-05-27T12:00:00.000Z') => ({
  author: { id: 'profile-1', name: 'Cade', user: { id: 'user-1' } },
  date,
  files: [],
  id: 'record-1',
  links: [],
  log: {
    id: 'log-1',
    name: 'Daily',
    profiles: [{ user: { id: 'user-1' } }],
    team: { roles: [{ role: Role.Member, userId: 'user-1' }] },
  },
  status: 'scheduled',
  tags: [],
  teamId: 'team-1',
  text: 'Scheduled record',
});

const createDb = ({
  record = scheduledRecord(),
  transactions,
}: {
  record?: ReturnType<typeof scheduledRecord>;
  transactions: Transaction[];
}) => ({
  query: async () => ({ records: [record] }),
  transact: async (transaction: Transaction | Transaction[]) => {
    transactions.push(
      ...(Array.isArray(transaction) ? transaction : [transaction])
    );
  },
  tx: { activities: entityTx('activities'), records: entityTx('records') },
});

describe('scheduled record updates', () => {
  beforeEach(() => {
    scheduleCalls.length = 0;
    cancelCalls.length = 0;
    scheduleRecordPublish.mockClear();
    cancelRecordPublishSchedules.mockClear();
  });

  test('reschedules future date', async () => {
    const transactions: Transaction[] = [];
    const env = {} as unknown as CloudflareEnv;
    const db = createDb({ transactions });
    const date = '2999-05-27T12:00:00.000Z';

    const result = await recordPublish.updateScheduledRecordSchedule({
      date,
      dbClient: db as never,
      env,
      recordId: 'record-1',
      text: 'Edited schedule',
      userId: 'user-1',
    });

    expect(result).toEqual({ scheduledFor: date, status: 'scheduled' });

    expect(scheduleCalls).toEqual([
      { env, payload: { publishAt: date, recordId: 'record-1' } },
    ]);

    expect(cancelCalls).toEqual([
      {
        env,
        options: { exceptScheduleId: 'schedule-1' },
        recordId: 'record-1',
      },
    ]);

    expect(transactions[0]).toMatchObject({
      entity: 'records',
      fields: { date, status: 'scheduled', text: 'Edited schedule' },
      id: 'record-1',
    });
  });

  test('publishes past date', async () => {
    const transactions: Transaction[] = [];
    const env = {} as unknown as CloudflareEnv;
    const db = createDb({ transactions });
    const date = '2026-05-01T12:00:00.000Z';

    const result = await recordPublish.updateScheduledRecordSchedule({
      date,
      dbClient: db as never,
      env,
      recordId: 'record-1',
      text: 'Publish now',
      userId: 'user-1',
    });

    expect(result).toEqual({ status: 'published' });
    expect(scheduleCalls).toEqual([]);

    expect(cancelCalls).toEqual([
      { env, options: undefined, recordId: 'record-1' },
    ]);

    const recordUpdate = transactions.find(
      (transaction) => transaction.entity === 'records'
    );

    expect(recordUpdate).toMatchObject({
      entity: 'records',
      fields: { date, status: 'published', text: 'Publish now' },
      id: 'record-1',
    });
  });
});
