import type { Link } from '@/features/records/types/link';
import { db } from '@/lib/db';
import { id } from '@instantdb/react-native';

type CreateLinkInput = Pick<Link, 'label' | 'order' | 'url'> &
  Partial<Pick<Link, 'teamId'>> & {
    linkId?: Link['id'];
    parentId?: string;
    parentType: 'record' | 'reply';
  };

export const createLink = async ({
  label,
  linkId,
  order,
  parentId,
  parentType,
  teamId,
  url,
}: CreateLinkInput) => {
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
