import { createSearchIndex } from '@/lib/search';
import * as React from 'react';

type NamedItem = { id: string; name?: string | null };
type SearchDocument = { id: string; name: string };

export const useNameSearch = <T extends NamedItem>(
  items: T[],
  query: string
) => {
  const searchIndex = React.useMemo(
    () =>
      createSearchIndex<SearchDocument>({
        documents: items.flatMap((item) => {
          const name = item.name?.trim();
          return name ? [{ id: item.id, name }] : [];
        }),
        fields: ['name'],
        storeFields: ['id'],
      }),
    [items]
  );

  return React.useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return items;

    const matchIds = new Set(
      searchIndex.search(trimmed).map((result) => String(result.id))
    );

    return items.filter((item) => matchIds.has(item.id));
  }, [items, query, searchIndex]);
};
