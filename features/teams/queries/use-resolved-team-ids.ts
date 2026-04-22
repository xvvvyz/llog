import { useUi } from '@/queries/use-ui';
import * as React from 'react';

export const useResolvedTeamIds = (teamIds?: string[]) => {
  const ui = useUi();

  return React.useMemo(() => {
    if (teamIds) return teamIds;
    if (ui.activeTeamId) return [ui.activeTeamId];
    return [];
  }, [teamIds, ui.activeTeamId]);
};
