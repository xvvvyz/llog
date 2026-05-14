import { db } from '@/lib/db';
import { id } from '@instantdb/react-native';

export const createLink = async ({
  label,
  linkId,
  order,
  parentId,
  parentType,
  teamId,
  url,
}: {
  label: string;
  linkId?: string;
  order: number;
  parentId?: string;
  parentType: 'record' | 'reply';
  teamId?: string;
  url: string;
}) => {
  if (!parentId || !teamId) return;
  const nextLinkId = linkId ?? id();
  const link = db.tx.links[nextLinkId].update({ label, order, teamId, url });

  await db.transact(
    parentType === 'record'
      ? link.link({ record: parentId })
      : link.link({ reply: parentId })
  );

  return nextLinkId;
};
