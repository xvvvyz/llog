import { db } from '@/lib/db';

export const markActivitiesRead = async ({
  uiId,
  date,
}: {
  uiId?: string;
  date: number | string;
}) => {
  if (!uiId) return;

  return db.transact(
    db.tx.ui[uiId].update({
      activityLastReadDate: date,
    })
  );
};
