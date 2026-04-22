import { db } from '@/lib/db';
import { resolveUiId } from '@/queries/resolve-ui-id';

export const switchTeam = async ({
  teamId,
  uiId,
}: {
  teamId: string;
  uiId?: string;
}) => {
  const resolvedUiId = await resolveUiId(uiId);
  if (!resolvedUiId) return;
  return db.transact(db.tx.ui[resolvedUiId].link({ team: teamId }));
};
