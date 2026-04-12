import { useUi } from '@/queries/use-ui';
import { useMemo } from 'react';

export const useResolvedTeamIds = (teamIds?: string[]) => {
  const ui = useUi();

  return useMemo(() => {
    if (teamIds) return teamIds;
    if (ui.activeTeamId) return [ui.activeTeamId];
    return [];
  }, [teamIds, ui.activeTeamId]);
};
