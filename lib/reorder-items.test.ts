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
let applyOrderedIds!: (typeof import('@/lib/reorder-items'))['applyOrderedIds'];

beforeAll(async () => {
  ({ applyOrderedIds, reorderItems } = await import('@/lib/reorder-items'));
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

describe('applyOrderedIds', () => {
  const items = [
    { id: 'first' },
    { id: 'second' },
    { id: 'third' },
    { id: 'fourth' },
  ];

  test('applies a full ordered id list', () => {
    expect(
      applyOrderedIds(items, ['fourth', 'second', 'first', 'third']).map(
        (item) => item.id
      )
    ).toEqual(['fourth', 'second', 'first', 'third']);
  });

  test('reorders dynamic subsets inside their existing slots', () => {
    expect(
      applyOrderedIds(items, ['fourth', 'second']).map((item) => item.id)
    ).toEqual(['first', 'fourth', 'third', 'second']);
  });

  test('ignores unknown and duplicate ids', () => {
    expect(
      applyOrderedIds(items, ['missing', 'third', 'third', 'first']).map(
        (item) => item.id
      )
    ).toEqual(['third', 'second', 'first', 'fourth']);
  });

  test('leaves the original list alone without enough known ids', () => {
    expect(applyOrderedIds(items, ['missing']).map((item) => item.id)).toEqual([
      'first',
      'second',
      'third',
      'fourth',
    ]);

    expect(applyOrderedIds(items, ['third']).map((item) => item.id)).toEqual([
      'first',
      'second',
      'third',
      'fourth',
    ]);
  });
});
