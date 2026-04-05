import { db } from '@/utilities/db';

export const markActivitiesRead = async ({ uiId }: { uiId?: string }) => {
  if (!uiId) return;

  return db.transact(
    db.tx.ui[uiId].update({
      activityLastReadDate: new Date().toISOString(),
    })
  );
};
