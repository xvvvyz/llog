import { visibleFileQuery } from '@/domain/files/query';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const useRecord = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id
      ? {
          records: {
            $: { where: { id } },
            author: { image: {} },
            replies: {
              $: { where: { isDraft: { $not: true } } },
              author: { image: {} },
              files: visibleFileQuery,
              links: {},
              reactions: { author: {} },
            },
            files: visibleFileQuery,
            links: {},
            log: {},
            reactions: { author: {} },
            tags: {
              $: {
                fields: ['color', 'id', 'name', 'order', 'teamId', 'type'],
                where: { type: 'record' },
              },
            },
          },
        }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(id, data);
  const records = id && hasCurrentResult ? (data?.records ?? []) : [];
  const record = records.find((item) => item.id === id);

  const hasStaleResult =
    !!id && hasCurrentResult && records.length > 0 && !record;

  const replies = (record?.replies ?? []).map((reply) => ({
    ...reply,
    files: reply.files ?? [],
  }));

  const files = record?.files ?? [];
  const links = record?.links ?? [];

  return {
    ...record,
    links,
    replies,
    files,
    isLoading: !!id && (isLoading || !hasCurrentResult || hasStaleResult),
  };
};

export type UseRecordResult = ReturnType<typeof useRecord>;
