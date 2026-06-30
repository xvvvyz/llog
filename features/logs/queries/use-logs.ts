import { logTagsQuery } from '@/domain/tags/query';
import { useUi } from '@/features/account/queries/use-ui';
import type { FileItem } from '@/features/files/types/file';
import * as logDeletions from '@/features/logs/queries/log-deletions';
import type { Log } from '@/features/logs/types/log';
import type { Profile } from '@/features/account/types/profile';
import type { Tag } from '@/features/tags/types/tag';
import { useResolvedTeamIds } from '@/features/teams/queries/use-resolved-team-ids';
import { db } from '@/lib/db';
import * as React from 'react';

type LogListItem = Log & {
  profiles?: (Pick<Profile, 'avatarSeedId' | 'id' | 'name'> & {
    image?: Pick<FileItem, 'uri'>;
  })[];
  tags: Pick<Tag, 'id'>[];
};

export const useLogs = ({ teamIds }: { teamIds?: string[] } = {}) => {
  const ui = useUi();
  const resolvedTeamIds = useResolvedTeamIds(teamIds);
  const locallyDeletedLogIds = logDeletions.useLocallyDeletedLogIds();

  const locallyDeletedLogIdSet = React.useMemo(
    () => new Set(locallyDeletedLogIds),
    [locallyDeletedLogIds]
  );

  const { data, isLoading } = db.useQuery(
    resolvedTeamIds.length
      ? {
          logs: {
            $: {
              order: { [ui.logsSortBy]: ui.logsSortDirection },
              where: { teamId: { $in: resolvedTeamIds } },
            },
            tags: logTagsQuery,
            profiles: { image: {} },
          },
        }
      : null
  );

  const logs = (data?.logs ?? []) as LogListItem[];

  React.useEffect(() => {
    if (!data?.logs) return;

    logDeletions.clearObservedLocallyDeletedLogs({
      logIds: new Set(data.logs.map((log) => log.id)),
      teamIds: new Set(resolvedTeamIds),
    });
  }, [data?.logs, resolvedTeamIds]);

  return {
    data: logs.filter((log) => !locallyDeletedLogIdSet.has(log.id)),
    isLoading,
  };
};
