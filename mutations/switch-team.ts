import { getUi } from '@/queries/get-ui';
import { db } from '@/utilities/db';

export const switchTeam = async ({ teamId }: { teamId: string }) => {
  const ui = await getUi();
  if (!ui) return;
  return db.transact(db.tx.ui[ui.id].link({ team: teamId }));
};
