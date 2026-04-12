import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';

export const publishRecord = async ({
  id: recordId,
  logId,
  profileId,
  teamId,
}: {
  id?: string;
  logId?: string;
  profileId?: string;
  teamId?: string;
}) => {
  if (!recordId) return;

  const { data } = await db.queryOnce({
    records: {
      $: { where: { id: recordId }, fields: ['text'] },
      media: { $: { fields: ['id'] } },
    },
  });

  const record = data.records?.[0];
  const hasContent = !!record?.text?.trim() || !!record?.media?.length;
  if (!hasContent) return;
  const now = new Date().toISOString();

  if (logId && profileId && teamId) {
    return db.transact([
      db.tx.records[recordId].update({ date: now, isDraft: false }),
      db.tx.activities[id()]
        .update({
          type: 'record_published',
          date: now,
          teamId,
        })
        .link({ actor: profileId, team: teamId, record: recordId, log: logId }),
    ]);
  }

  return db.transact(
    db.tx.records[recordId].update({ date: now, isDraft: false })
  );
};
