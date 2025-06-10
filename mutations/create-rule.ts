import { getActiveTeamId } from '@/queries/get-active-team-id';
import { getProfile } from '@/queries/get-profile';
import { db } from '@/utilities/ui/db';
import { id as generateId } from '@instantdb/react-native';

export const createRule = async ({
  id,
  prompt,
}: {
  id?: string;
  prompt: string;
}) => {
  const [teamId, profile] = await Promise.all([
    getActiveTeamId(),
    getProfile(),
  ]);

  if (!teamId || !profile) return;

  return db.transact(
    db.tx.rules[id ?? generateId()]
      .update({ prompt })
      .link({ author: profile.id, team: teamId })
  );
};
