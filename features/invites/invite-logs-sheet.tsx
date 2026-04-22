import { InviteLogsSheetContent } from '@/features/invites/invite-logs-sheet-content';
import { useCopy } from '@/hooks/use-copy';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import { findMemberInviteByLogs } from '@/lib/invite-matching';
import { getInviteUrl } from '@/lib/invite-url';
import { createInviteLink } from '@/mutations/create-invite-link';
import { useTeamInvites } from '@/queries/use-team-invite-links';
import { useUi } from '@/queries/use-ui';
import { Role } from '@/types/role';
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

  const handleConfirm = React.useCallback(async () => {
    if (!activeTeamId || selectedLogIds.size === 0) return;
    setIsLoading(true);

    try {
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

      const url = getInviteUrl(token);

      if (action === 'qr') {
        sheetManager.close('invite-logs');
        setTimeout(() => sheetManager.open('invite-qr', url), 300);
        return;
      }

      await copy(url);
      setIsLoading(false);

      dismissTimer.current = setTimeout(() => {
        setSelectedLogIds(new Set());
        sheetManager.close('invite-logs');
      }, 1500);
    } catch {
      setIsLoading(false);
    }
  }, [activeTeamId, selectedLogIds, invites, action, sheetManager, copy]);

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
