import type { Note } from '@/features/logs/types/note';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const logNoteFields = [
  'id' as const,
  'logId' as const,
  'teamId' as const,
  'text' as const,
];

export const useLogNote = ({
  enabled = true,
  logId,
}: {
  enabled?: boolean;
  logId?: string;
}) => {
  const queryKey = enabled && logId ? logId : undefined;

  const { data, isLoading } = db.useQuery(
    queryKey
      ? { notes: { $: { fields: logNoteFields, where: { logId: queryKey } } } }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(queryKey, data);

  const notes =
    queryKey && hasCurrentResult ? ((data?.notes ?? []) as Note[]) : [];

  const note = notes.find((item) => item.logId === queryKey);

  const hasStaleResult =
    !!queryKey && hasCurrentResult && notes.length > 0 && !note;

  return {
    ...note,
    isLoading: !!queryKey && (isLoading || !hasCurrentResult || hasStaleResult),
  };
};
