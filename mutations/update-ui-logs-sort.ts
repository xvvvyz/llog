import { SortBy } from '@/components/log-list-actions';
import { SortDirection } from '@/components/ui/dropdown-menu';
import { db } from '@/utilities/db';

export const updateUiLogsSort = async ({
  sort,
}: {
  sort: [SortBy, SortDirection];
}) => {
  const auth = await db.getAuth();
  if (!auth) return;

  return db.transact(
    db.tx.ui[auth.id].update({
      logsSortBy: sort[0],
      logsSortDirection: sort[1],
    })
  );
};
