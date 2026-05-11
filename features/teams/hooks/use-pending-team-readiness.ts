import { useUi } from '@/features/account/queries/use-ui';
import { useLogs } from '@/features/logs/queries/use-logs';
import { useTeams } from '@/features/teams/queries/use-teams';
import * as React from 'react';
import * as pendingReadiness from '@/hooks/use-pending-readiness';

export const usePendingTeamReadiness = ({
  onReady,
}: {
  onReady: (teamId: string) => void;
}) => {
  const ui = useUi();
  const { teams } = useTeams();
  const pending = pendingReadiness.usePendingValue<string>();

  const pendingTeamIds = React.useMemo(
    () => (pending.pendingValue ? [pending.pendingValue] : []),
    [pending.pendingValue]
  );

  const pendingLogs = useLogs({ teamIds: pendingTeamIds });

  const isReady = React.useCallback(
    (teamId: string) =>
      ui.activeTeamId === teamId &&
      teams.some((team) => team.id === teamId) &&
      !pendingLogs.isLoading,
    [pendingLogs.isLoading, teams, ui.activeTeamId]
  );

  pendingReadiness.useOnPendingReady({
    clear: pending.clear,
    isReady,
    onReady,
    pendingValue: pending.pendingValue,
  });

  return pending;
};
