import { SortBy } from '@/components/log-list-actions';
import { SortDirection } from '@/components/ui/dropdown-menu';
import { getUi } from '@/queries/get-ui';
import { db } from '@/utilities/db';

export const updateUiLogsSort = async ({
  sort,
}: {
  sort: [SortBy, SortDirection];
}) => {
  const ui = await getUi();
  if (!ui) return;

  return db.transact(
    db.tx.ui[ui.id].update({
      logsSortBy: sort[0],
      logsSortDirection: sort[1],
    })
  );
};
