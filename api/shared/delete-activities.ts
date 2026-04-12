import { createAdminDb } from '@/api/middleware/db';

export const deleteActivities = async (
  env: CloudflareEnv,
  activities: { id: string }[]
) => {
  if (!activities.length) return;
  const adminDb = createAdminDb(env);

  await adminDb.transact(
    activities.map((activity) => adminDb.tx.activities[activity.id].delete())
  );
};
