import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import { resolveSpectrumColor, SPECTRUM } from '@/theme/spectrum';

export const useLogColor = ({ id }: { id?: string }) => {
  const colorScheme = useColorScheme();

  const { data } = db.useQuery(
    id
      ? {
          logs: {
            $: { fields: ['color' as const, 'id' as const], where: { id } },
          },
        }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(id, data);

  const log =
    id && hasCurrentResult ? data?.logs?.find((item) => item.id === id) : null;

  return SPECTRUM[colorScheme][resolveSpectrumColor(log?.color)];
};
