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
let getReorderedItems!: (typeof import('@/lib/reorder-items'))['getReorderedItems'];

beforeAll(async () => {
  ({ applyOrderedIds, getReorderedItems, reorderItems } =
    await import('@/lib/reorder-items'));
});

beforeEach(() => {
  transactedItems = undefined;
  transactResult = { clientId: 'test-client', status: 'synced' };
  transact.mockClear();
});

describe('reorderItems', () => {
  test('skips empty reorder', async () => {
    const failTransaction = () => {
      throw new Error('getTransaction should not be called');
    };

    await expect(reorderItems([], failTransaction)).resolves.toBeUndefined();

    await expect(
      reorderItems([{ id: 'only' }], failTransaction)
    ).resolves.toBeUndefined();

    expect(transact).not.toHaveBeenCalled();
  });

  test('builds reorder txs', async () => {
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

  test('applies full order', () => {
    expect(
      applyOrderedIds(items, ['fourth', 'second', 'first', 'third']).map(
        (item) => item.id
      )
    ).toEqual(['fourth', 'second', 'first', 'third']);
  });

  test('reorders subsets', () => {
    expect(
      applyOrderedIds(items, ['fourth', 'second']).map((item) => item.id)
    ).toEqual(['first', 'fourth', 'third', 'second']);
  });

  test('ignores invalid ids', () => {
    expect(
      applyOrderedIds(items, ['missing', 'third', 'third', 'first']).map(
        (item) => item.id
      )
    ).toEqual(['third', 'second', 'first', 'fourth']);
  });

  test('skips partial ids', () => {
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

describe('getReorderedItems', () => {
  test('keeps order slots', () => {
    expect(
      getReorderedItems([
        { id: 'third', order: 30 },
        { id: 'first', order: 10 },
        { id: 'second', order: 20 },
      ])
    ).toEqual([
      { id: 'third', order: 10 },
      { id: 'first', order: 20 },
      { id: 'second', order: 30 },
    ]);
  });

  test('fills missing orders', () => {
    expect(getReorderedItems([{ id: 'second' }, { id: 'first' }])).toEqual([
      { id: 'second', order: 0 },
      { id: 'first', order: 1 },
    ]);
  });
});
