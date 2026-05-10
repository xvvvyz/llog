import { recordTagsQuery } from '@/domain/tags/query';
import type { LogTemplate } from '@/features/logs/types/template';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const logTemplateFields = [
  'id' as const,
  'order' as const,
  'teamId' as const,
  'text' as const,
];

export const useLogTemplates = ({
  enabled = true,
  logId,
}: {
  enabled?: boolean;
  logId?: string;
}) => {
  const queryKey = enabled && logId ? logId : undefined;

  const { data, isLoading } = db.useQuery(
    queryKey
      ? {
          templates: {
            $: {
              fields: logTemplateFields,
              order: { order: 'asc' },
              where: { log: queryKey },
            },
            tags: recordTagsQuery,
          },
        }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(queryKey, data);
  const templates = queryKey && hasCurrentResult ? (data?.templates ?? []) : [];

  return {
    data: templates as LogTemplate[],
    isLoading: !!queryKey && (isLoading || !hasCurrentResult),
  };
};

export const useLogTemplate = ({
  enabled = true,
  id,
}: {
  enabled?: boolean;
  id?: string;
}) => {
  const queryKey = enabled && id ? id : undefined;

  const { data, isLoading } = db.useQuery(
    queryKey
      ? {
          templates: {
            $: { fields: logTemplateFields, where: { id: queryKey } },
            log: { $: { fields: ['id' as const] } },
            tags: recordTagsQuery,
          },
        }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(queryKey, data);
  const templates = queryKey && hasCurrentResult ? (data?.templates ?? []) : [];
  const template = templates.find((item) => item.id === queryKey);

  const hasStaleResult =
    !!queryKey && hasCurrentResult && templates.length > 0 && !template;

  return {
    ...(template as LogTemplate | undefined),
    isLoading: !!queryKey && (isLoading || !hasCurrentResult || hasStaleResult),
  };
};
