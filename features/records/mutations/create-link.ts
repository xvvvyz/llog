import { db } from '@/lib/db';
import { id } from '@instantdb/react-native';

export const createLink = async ({
  label,
  order,
  parentId,
  parentType,
  teamId,
  url,
}: {
  label: string;
  order: number;
  parentId?: string;
  parentType: 'record' | 'reply';
  teamId?: string;
  url: string;
}) => {
  if (!parentId || !teamId) return;
  const link = db.tx.links[id()].update({ label, order, teamId, url });

  return db.transact(
    parentType === 'record'
      ? link.link({ record: parentId })
      : link.link({ reply: parentId })
  );
};
