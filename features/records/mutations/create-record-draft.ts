import * as recordIdentity from '@/domain/records/identity-fields';
import { resolveProfileAndTeam } from '@/features/account/queries/resolve-profile-and-team';
import { db } from '@/lib/db';
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
        where: recordIdentity.getDraftRecordLookupWhere({
          authorId: resolved.profileId,
          logId,
        }),
      },
    },
  });

  if (data.records?.[0]?.id) return data.records[0].id;
  const recordId = id();

  await db.transact(
    db.tx.records[recordId]
      .update({
        ...recordIdentity.getRecordIdentityFields({
          authorId: resolved.profileId,
          logId,
        }),
        date: new Date().toISOString(),
        isDraft: true,
        teamId: resolved.teamId,
      })
      .link({ author: resolved.profileId, log: logId })
  );

  return recordId;
};
