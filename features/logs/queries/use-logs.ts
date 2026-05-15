import { logTagsQuery } from '@/domain/tags/query';
import { useUi } from '@/features/account/queries/use-ui';
import type { FileItem } from '@/features/files/types/file';
import type { Log } from '@/features/logs/types/log';
import type { Profile } from '@/features/account/types/profile';
import type { Tag } from '@/features/tags/types/tag';
import { useResolvedTeamIds } from '@/features/teams/queries/use-resolved-team-ids';
import { db } from '@/lib/db';

type LogListItem = Log & {
  profiles?: (Pick<Profile, 'avatarSeedId' | 'id' | 'name'> & {
    image?: Pick<FileItem, 'uri'>;
  })[];
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
