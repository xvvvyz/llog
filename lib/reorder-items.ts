import { db } from '@/lib/db';

type OrderedItem = { id: string };
type TransactionInput = Parameters<typeof db.transact>[0];
type Transaction = Extract<TransactionInput, unknown[]>[number];

export const reorderItems = async (
  items: OrderedItem[],
  getTransaction: (id: string, order: number) => Transaction
) => {
  if (items.length < 2) return;

  return db.transact(
    items.map((item, order) => getTransaction(item.id, order))
  );
};
