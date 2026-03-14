import { db } from '@/utilities/db';

export const publishComment = async ({
  id,
  text,
}: {
  id?: string;
  text: string;
}) => {
  if (!id) return;

  return db.transact(
    db.tx.comments[id].update({
      date: new Date().toISOString(),
      isDraft: false,
      text,
    })
  );
};
