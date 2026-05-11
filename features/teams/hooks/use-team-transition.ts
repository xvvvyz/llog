import { useUi } from '@/features/account/queries/use-ui';
import { createTeam } from '@/features/teams/mutations/create';
import { switchTeam } from '@/features/teams/mutations/switch';
import * as React from 'react';
import { usePendingTeamReadiness } from './use-pending-team-readiness';

export const useTeamTransition = ({ onReady }: { onReady: () => void }) => {
  const ui = useUi();
  const [isCreatingTeam, setIsCreatingTeam] = React.useState(false);

  const pending = usePendingTeamReadiness({
    onReady: () => {
      setIsCreatingTeam(false);
      onReady();
    },
  });

  const switchToTeam = React.useCallback(
    async (teamId: string) => {
      if (teamId === ui.activeTeamId || pending.isPending || isCreatingTeam) {
        return;
      }

      pending.begin(teamId);

      try {
        await switchTeam({ teamId, uiId: ui.id });
      } catch (error) {
        pending.clear();
        throw error;
      }
    },
    [isCreatingTeam, pending, ui.activeTeamId, ui.id]
  );

  const createAndSwitchToTeam = React.useCallback(async () => {
    if (pending.isPending || isCreatingTeam) return;
    setIsCreatingTeam(true);

    try {
      const teamId = await createTeam({ name: 'Team' });

      if (teamId) pending.begin(teamId);
      else setIsCreatingTeam(false);
    } catch (error) {
      setIsCreatingTeam(false);
      pending.clear();
      throw error;
    }
  }, [isCreatingTeam, pending]);

  return {
    activeTeamId: ui.activeTeamId,
    createAndSwitchToTeam,
    isCreatingTeam,
    isPending: pending.isPending || isCreatingTeam,
    pendingTeamId: pending.pendingValue,
    switchToTeam,
  };
};
