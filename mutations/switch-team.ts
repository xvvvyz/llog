import { resolveUiId } from '@/queries/resolve-ui-id';
import { db } from '@/utilities/db';

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
