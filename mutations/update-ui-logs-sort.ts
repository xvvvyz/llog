import { SortBy } from '@/components/log-list-actions';
import { SortDirection } from '@/components/ui/dropdown-menu';
import { resolveUiId } from '@/queries/resolve-ui-id';
import { db } from '@/utilities/db';

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
