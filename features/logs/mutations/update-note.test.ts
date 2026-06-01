import { beforeEach, describe, expect, mock, test } from 'bun:test';

type Transaction = {
  action: 'delete' | 'update';
  entity: string;
  fields?: Record<string, unknown>;
  id: string;
  links?: Record<string, string>;
};

const transactions: Transaction[] = [];
let generatedIds: string[] = [];
let notes: { id: string }[] = [];
const generateId = mock(() => generatedIds.shift() ?? 'note-generated');
const queryOnce = mock(async () => ({ data: { notes } }));

const transact = mock(async (transaction: Transaction | Transaction[]) => {
  transactions.push(
    ...(Array.isArray(transaction) ? transaction : [transaction])
  );
});

const createTransaction = ({
  action,
  entity,
  id,
  fields,
}: Omit<Transaction, 'links'>) => {
  const transaction: Transaction = { action, entity, fields, id };

  return {
    ...transaction,
    link: (links: Record<string, string>) => ({ ...transaction, links }),
  };
};

const createTxNamespace = (entity: string) =>
  new Proxy(
    {},
    {
      get: (_target, id: string | symbol) =>
        typeof id === 'string'
          ? {
              delete: () => ({ action: 'delete' as const, entity, id }),
              update: (fields: Record<string, unknown>) =>
                createTransaction({ action: 'update', entity, fields, id }),
            }
          : undefined,
    }
  );

mock.module('@instantdb/react-native', () => ({ id: generateId }));

mock.module('@/lib/db', () => ({
  db: { queryOnce, transact, tx: { notes: createTxNamespace('notes') } },
}));

const noteMutations = await import('@/features/logs/mutations/update-note');

beforeEach(() => {
  generatedIds = ['note-generated'];
  notes = [];
  transactions.length = 0;
  generateId.mockClear();
  queryOnce.mockClear();
  transact.mockClear();
});

describe('log note mutations', () => {
  test('deletes note', async () => {
    await noteMutations.deleteNote({
      logId: 'log-1',
      noteId: 'note-1',
      teamId: 'team-1',
    });

    expect(queryOnce).not.toHaveBeenCalled();

    expect(transactions).toEqual([
      { action: 'delete', entity: 'notes', id: 'note-1' },
    ]);
  });

  test('skips missing note', async () => {
    await noteMutations.deleteNote({ logId: 'log-1', teamId: 'team-1' });
    expect(queryOnce).toHaveBeenCalledTimes(1);
    expect(transact).not.toHaveBeenCalled();
  });

  test('deletes existing note', async () => {
    notes = [{ id: 'note-existing' }];
    await noteMutations.deleteNote({ logId: 'log-1', teamId: 'team-1' });

    expect(transactions).toEqual([
      { action: 'delete', entity: 'notes', id: 'note-existing' },
    ]);
  });

  test('deletes blank note', async () => {
    await noteMutations.updateNote({
      logId: 'log-1',
      noteId: 'note-1',
      teamId: 'team-1',
      text: '   ',
    });

    expect(transactions).toEqual([
      { action: 'delete', entity: 'notes', id: 'note-1' },
    ]);
  });

  test('uses generated id', async () => {
    await noteMutations.updateNote({
      logId: 'log-1',
      teamId: 'team-1',
      text: 'New note',
    });

    expect(generateId).toHaveBeenCalledTimes(1);

    expect(transactions).toEqual([
      {
        action: 'update',
        entity: 'notes',
        fields: { logId: 'log-1', teamId: 'team-1', text: 'New note' },
        id: 'note-generated',
        links: { log: 'log-1' },
      },
    ]);
  });
});
