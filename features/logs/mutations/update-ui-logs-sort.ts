import { SortBy } from '@/features/logs/components/log-list-actions';
import { db } from '@/lib/db';
import { resolveUiId } from '@/queries/resolve-ui-id';
import { SortDirection } from '@/ui/dropdown-menu';

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
