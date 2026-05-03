import { db } from '@/lib/db';
import type { Color } from '@/theme/spectrum';

export const updateTag = async ({
  color,
  id,
  name,
}: {
  color?: Color;
  id: string;
  name?: string;
}) => {
  const updates: { color?: Color; name?: string } = {};
  if (name !== undefined) updates.name = name.trim();
  if (color !== undefined) updates.color = color;
  if (!Object.keys(updates).length) return;
  return db.transact(db.tx.tags[id].update(updates));
};
