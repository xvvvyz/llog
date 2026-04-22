import { InviteLogsSheetContent } from '@/features/invites/components/invite-logs-sheet-content';
import { findMemberInviteByLogs } from '@/features/invites/lib/invite-matching';
import { getInviteUrl } from '@/features/invites/lib/invite-url';
import { createInviteLink } from '@/features/invites/mutations/create-invite-link';
import { useTeamInvites } from '@/features/invites/queries/use-team-invite-links';
import { Role } from '@/features/teams/types/role';
import { useCopy } from '@/hooks/use-copy';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import { useUi } from '@/queries/use-ui';
import { Sheet } from '@/ui/sheet';
import * as React from 'react';

export const InviteLogsSheet = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const sheetManager = useSheetManager();
  const actionId = sheetManager.getId('invite-logs');

  const action =
    actionId === 'copy' || actionId === 'qr' ? actionId : undefined;

  const dismissTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const open = sheetManager.isOpen('invite-logs');
  const { activeTeamId } = useUi();
  const { copy, copied } = useCopy();
  const { invites } = useTeamInvites();

  const [selectedLogIds, setSelectedLogIds] = React.useState<Set<string>>(
    new Set()
  );

  React.useEffect(() => {
    if (open) {
      setSelectedLogIds(new Set());
      setIsLoading(false);
    }
  }, [open]);

  const { data } = db.useQuery(
    activeTeamId
      ? {
          logs: {
            $: {
              order: { name: 'asc' },
              where: { team: activeTeamId },
            },
          },
        }
      : null
  );

  const logs = data?.logs ?? [];

  const toggleLog = React.useCallback((logId: string) => {
    setSelectedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  }, []);

  const getInviteUrlForSelection = React.useCallback(async () => {
    if (!activeTeamId || selectedLogIds.size === 0) {
      throw new Error('No invite logs selected');
    }

    const logIds = [...selectedLogIds];
    const existing = findMemberInviteByLogs(invites, logIds);

    const token = existing
      ? existing.token
      : (
          await createInviteLink({
            teamId: activeTeamId,
            role: Role.Member,
            logIds,
          })
        ).token;

    return getInviteUrl(token);
  }, [activeTeamId, invites, selectedLogIds]);

  const handleConfirm = React.useCallback(async () => {
    if (!activeTeamId || selectedLogIds.size === 0) return;
    setIsLoading(true);

    try {
      if (action === 'qr') {
        const url = await getInviteUrlForSelection();
        sheetManager.close('invite-logs');
        setTimeout(() => sheetManager.open('invite-qr', url), 300);
        return;
      }

      await copy(getInviteUrlForSelection);
      setIsLoading(false);

      dismissTimer.current = setTimeout(() => {
        setSelectedLogIds(new Set());
        sheetManager.close('invite-logs');
      }, 1500);
    } catch {
      setIsLoading(false);
    }
  }, [
    activeTeamId,
    selectedLogIds,
    action,
    sheetManager,
    copy,
    getInviteUrlForSelection,
  ]);

  const handleDismiss = React.useCallback(() => {
    clearTimeout(dismissTimer.current);
    sheetManager.close('invite-logs');
  }, [sheetManager]);

  return (
    <Sheet onDismiss={handleDismiss} open={open} portalName="invite-logs">
      <InviteLogsSheetContent
        action={action}
        copied={copied}
        isLoading={isLoading}
        logs={logs}
        onConfirm={handleConfirm}
        onToggleLog={toggleLog}
        selectedLogIds={selectedLogIds}
      />
    </Sheet>
  );
};
