import { getActiveTeamId } from '@/queries/get-active-team-id';
import { getProfile } from '@/queries/get-profile';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';

export const addComment = async ({
  recordId,
  text,
}: {
  recordId: string;
  text: string;
}) => {
  const [profile, teamId] = await Promise.all([
    getProfile(),
    getActiveTeamId(),
  ]);

  if (!profile || !teamId) return;

  return db.transact(
    db.tx.comments[id()]
      .update({ date: new Date().toISOString(), teamId, text })
      .link({ author: profile.id, record: recordId })
  );
};
