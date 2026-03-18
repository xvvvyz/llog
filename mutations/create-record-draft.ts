import { getActiveTeamId } from '@/queries/get-active-team-id';
import { getProfile } from '@/queries/get-profile';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';

export const createRecordDraft = async ({ logId }: { logId?: string }) => {
  if (!logId) return;

  const [profile, teamId] = await Promise.all([
    getProfile(),
    getActiveTeamId(),
  ]);

  if (!profile || !teamId) return;

  const { data } = await db.queryOnce({
    records: {
      $: {
        fields: ['id'],
        where: { author: profile.id, log: logId, isDraft: true },
      },
    },
  });

  if (data.records?.[0]) return;

  return db.transact(
    db.tx.records[id()]
      .update({ date: new Date().toISOString(), isDraft: true, teamId })
      .link({ author: profile.id, log: logId })
  );
};
