import { getActiveTeamId } from '@/queries/get-active-team-id';
import { SpectrumColor } from '@/theme/spectrum';
import { db } from '@/utilities/db';
import { id as generateId } from '@instantdb/react-native';

export const createLog = async ({
  color,
  id,
  name,
}: {
  color: SpectrumColor;
  id?: string;
  name: string;
}) => {
  const teamId = await getActiveTeamId();
  if (!teamId) return;

  return db.transact(
    db.tx.logs[id ?? generateId()]
      .update({ color: color as number, name })
      .link({ team: teamId })
  );
};
