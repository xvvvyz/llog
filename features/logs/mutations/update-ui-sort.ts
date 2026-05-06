import { resolveUiId } from '@/features/account/queries/resolve-ui-id';
import type { SortBy } from '@/features/logs/lib/sort';
import { db } from '@/lib/db';
import type { SortDirection } from '@/lib/sort-direction';

export const updateUiLogsSort = async ({
  sort,
  uiId,
}: {
  sort: [SortBy, SortDirection];
  uiId?: string;
}) => {
  const resolvedUiId = await resolveUiId(uiId);
  if (!resolvedUiId) return;

  return db.transact(
    db.tx.ui[resolvedUiId].update({
      logsSortBy: sort[0],
      logsSortDirection: sort[1],
    })
  );
};
