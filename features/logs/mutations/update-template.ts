import { db } from '@/lib/db';

export const updateTemplate = async ({
  id,
  name,
  text,
}: {
  id: string;
  name?: string;
  text?: string;
}) => {
  const fields: { name?: string; text?: string } = {};
  if (name !== undefined) fields.name = name.trim();
  if (text !== undefined) fields.text = text.trim();
  return db.transact(db.tx.templates[id].update(fields));
};
