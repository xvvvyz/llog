import { SortBy } from '@/components/log-list-actions';
import { SortDirection } from '@/components/ui/dropdown-menu';
import { db } from '@/utilities/db';

export const updateUiLogsSort = ({
  sort,
  userId,
}: {
  sort: [SortBy, SortDirection];
  userId?: string;
}) => {
  if (!userId) return;

  db.transact(
    db.tx.ui[userId].update({
      logsSortBy: sort[0],
      logsSortDirection: sort[1],
    })
  );
};
