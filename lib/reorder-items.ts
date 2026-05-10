import { db } from '@/lib/db';

type OrderedItem = { id: string };
type TransactionInput = Parameters<typeof db.transact>[0];
type Transaction = Extract<TransactionInput, unknown[]>[number];

export const applyOrderedIds = <T extends OrderedItem>(
  items: T[],
  orderedIds: string[]
) => {
  if (items.length < 2 || orderedIds.length < 2) return items;
  const itemById = new Map(items.map((item) => [item.id, item]));
  const orderedItems: T[] = [];
  const seenIds = new Set<string>();

  for (const id of orderedIds) {
    if (seenIds.has(id)) continue;
    const item = itemById.get(id);
    if (!item) continue;
    orderedItems.push(item);
    seenIds.add(id);
  }

  if (orderedItems.length < 2) return items;
  let orderedIndex = 0;

  return items.map((item) =>
    seenIds.has(item.id) ? orderedItems[orderedIndex++] : item
  );
};

export const reorderItems = async (
  items: OrderedItem[],
  getTransaction: (id: string, order: number) => Transaction
) => {
  if (items.length < 2) return;

  return db.transact(
    items.map((item, order) => getTransaction(item.id, order))
  );
};
