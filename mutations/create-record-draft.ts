import { resolveProfileAndTeam } from '@/queries/resolve-profile-and-team';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';

export const createRecordDraft = async ({
  logId,
  profileId,
  teamId,
}: {
  logId?: string;
  profileId?: string;
  teamId: string;
}) => {
  if (!logId) return;
  const resolved = await resolveProfileAndTeam(profileId, teamId);
  if (!resolved) return;

  const { data } = await db.queryOnce({
    records: {
      $: {
        fields: ['id'],
        where: { author: resolved.profileId, log: logId, isDraft: true },
      },
    },
  });

  if (data.records?.[0]) return;

  return db.transact(
    db.tx.records[id()]
      .update({
        date: new Date().toISOString(),
        isDraft: true,
        teamId: resolved.teamId,
      })
      .link({ author: resolved.profileId, log: logId })
  );
};
