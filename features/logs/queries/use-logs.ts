import { logTagsQuery } from '@/domain/tags/query';
import { useUi } from '@/features/account/queries/use-ui';
import type { Log } from '@/features/logs/types/log';
import type { Tag } from '@/features/tags/types/tag';
import { useResolvedTeamIds } from '@/features/teams/queries/use-resolved-team-ids';
import { db } from '@/lib/db';

type LogListItem = Log & {
  profiles?: {
    avatarSeedId?: string;
    id: string;
    image?: { uri: string };
    name: string;
  }[];
  tags: Pick<Tag, 'id'>[];
};

export const useLogs = ({
  query,
  teamIds,
}: { query?: string; teamIds?: string[] } = {}) => {
  const ui = useUi();
  const resolvedTeamIds = useResolvedTeamIds(teamIds);

  const { data, isLoading } = db.useQuery(
    resolvedTeamIds.length
      ? {
          logs: {
            $: {
              order: { [ui.logsSortBy]: ui.logsSortDirection },
              where: {
                teamId: { $in: resolvedTeamIds },
                ...(query && { name: { $ilike: `%${query}%` } }),
              },
            },
            tags: logTagsQuery,
            profiles: { image: {} },
          },
        }
      : null
  );

  return { data: (data?.logs ?? []) as LogListItem[], isLoading };
};
