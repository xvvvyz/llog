import { beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

let transactedItems: unknown;

type ReorderResult = Awaited<
  ReturnType<(typeof import('@/lib/reorder-items'))['reorderItems']>
>;

let transactResult: ReorderResult;

const transact = mock((items: unknown) => {
  transactedItems = items;
  return transactResult;
});

mock.module('@/lib/db', () => ({ db: { transact } }));
let reorderItems!: (typeof import('@/lib/reorder-items'))['reorderItems'];

beforeAll(async () => {
  ({ reorderItems } = await import('@/lib/reorder-items'));
});

beforeEach(() => {
  transactedItems = undefined;
  transactResult = { clientId: 'test-client', status: 'synced' };
  transact.mockClear();
});

describe('reorderItems', () => {
  test('skips transactions when there is nothing to reorder', async () => {
    const failTransaction = () => {
      throw new Error('getTransaction should not be called');
    };

    await expect(reorderItems([], failTransaction)).resolves.toBeUndefined();

    await expect(
      reorderItems([{ id: 'only' }], failTransaction)
    ).resolves.toBeUndefined();

    expect(transact).not.toHaveBeenCalled();
  });

  test('builds dense order transactions from the supplied item order', async () => {
    const result = await reorderItems(
      [{ id: 'second' }, { id: 'first' }, { id: 'third' }],
      (id, order) => ({ id, order }) as never
    );

    expect(result).toBe(transactResult);
    expect(transact).toHaveBeenCalledTimes(1);

    expect(transactedItems).toEqual([
      { id: 'second', order: 0 },
      { id: 'first', order: 1 },
      { id: 'third', order: 2 },
    ]);
  });
});
