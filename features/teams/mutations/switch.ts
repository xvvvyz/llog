import { resolveUiId } from '@/features/account/queries/resolve-ui-id';
import { db } from '@/lib/db';

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
