import { Role } from '@/domain/teams/role';
import { useUi } from '@/features/account/queries/use-ui';
import { LogsSheetContent } from '@/features/invites/components/logs-sheet-content';
import { findMemberInviteByLogs } from '@/features/invites/lib/matching';
import { getInviteUrl } from '@/features/invites/lib/url';
import { createInviteLink } from '@/features/invites/mutations/create-link';
import { useTeamInvites } from '@/features/invites/queries/use-team-links';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import { Sheet } from '@/ui/sheet';
import * as React from 'react';

export const InviteLogsSheet = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('invite-logs');
  const { activeTeamId } = useUi();

  const payload = sheetManager.getPayload('invite-logs') as
    | { teamId?: string }
    | undefined;

  const teamId = payload?.teamId ?? activeTeamId;
  const { invites, isLoading: invitesLoading } = useTeamInvites({ teamId });

  const [selectedLogIds, setSelectedLogIds] = React.useState<Set<string>>(
    new Set()
  );

  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedLogIds(new Set());
      setIsLoading(false);
    }
  }, [open]);

  const { data, isLoading: logsLoading } = db.useQuery(
    open && teamId
      ? { logs: { $: { order: { name: 'asc' }, where: { team: teamId } } } }
      : null
  );

  const logsQueryKey = open && teamId ? teamId : undefined;
  const hasCurrentLogsResult = useCurrentQueryResult(logsQueryKey, data);
  const logs = hasCurrentLogsResult ? (data?.logs ?? []) : [];

  const toggleLog = React.useCallback((logId: string) => {
    setSelectedLogIds((prev) => {
      const next = new Set(prev);

      if (next.has(logId)) next.delete(logId);
      else next.add(logId);

      return next;
    });
  }, []);

  const getInviteUrlForSelection = React.useCallback(async () => {
    if (!teamId || selectedLogIds.size === 0) {
      throw new Error('No invite logs selected');
    }

    const logIds = [...selectedLogIds];
    const existing = findMemberInviteByLogs(invites, logIds);

    const invite =
      existing ??
      (await createInviteLink({ teamId, role: Role.Member, logIds }));

    return { id: invite.id, teamId, url: getInviteUrl(invite.token) };
  }, [teamId, invites, selectedLogIds]);

  const handleConfirm = React.useCallback(async () => {
    if (!teamId || selectedLogIds.size === 0) return;
    setIsLoading(true);

    try {
      const invite = await getInviteUrlForSelection();
      sheetManager.close('invite-logs');

      sheetManager.open('invite', invite.url, undefined, {
        inviteId: invite.id,
        teamId: invite.teamId,
      });
    } catch {
      setIsLoading(false);
    }
  }, [teamId, selectedLogIds, sheetManager, getInviteUrlForSelection]);

  const handleDismiss = React.useCallback(() => {
    sheetManager.close('invite-logs');
  }, [sheetManager]);

  return (
    <Sheet
      onDismiss={handleDismiss}
      open={open}
      portalName="invite-logs"
      variant="list"
      loading={
        (!!logsQueryKey && (logsLoading || !hasCurrentLogsResult)) ||
        invitesLoading
      }
    >
      <LogsSheetContent
        isLoading={isLoading}
        logs={logs}
        onConfirm={handleConfirm}
        onToggleLog={toggleLog}
        query={query}
        selectedLogIds={selectedLogIds}
        setQuery={setQuery}
      />
    </Sheet>
  );
};
