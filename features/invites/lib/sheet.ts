import type { Invite } from '@/instant.entities';
import { getInviteUrl } from '@/features/invites/lib/url';
import type { SheetManager } from '@/hooks/use-sheet-manager';

export type InviteLinkSheetLink = Pick<Invite, 'id' | 'teamId' | 'token'> & {
  onDeleted?: (inviteId: string) => void;
};

export const openInviteLinkSheet = (
  sheetManager: Pick<SheetManager, 'open'>,
  invite: InviteLinkSheetLink
) => {
  sheetManager.open('invite-link', getInviteUrl(invite.token), undefined, {
    inviteId: invite.id,
    onDeleted: invite.onDeleted,
    teamId: invite.teamId,
  });
};

export const getInviteLinkSheetPayload = (
  payload: unknown
): {
  inviteId: string;
  onDeleted?: (inviteId: string) => void;
  teamId: string;
} | null => {
  if (!payload || typeof payload !== 'object') return null;
  const inviteId = (payload as { inviteId?: unknown }).inviteId;
  const onDeleted = (payload as { onDeleted?: unknown }).onDeleted;
  const teamId = (payload as { teamId?: unknown }).teamId;
  if (typeof inviteId !== 'string' || typeof teamId !== 'string') return null;

  const onDeletedCallback =
    typeof onDeleted === 'function'
      ? (onDeleted as (inviteId: string) => void)
      : undefined;

  return {
    inviteId,
    ...(onDeletedCallback ? { onDeleted: onDeletedCallback } : {}),
    teamId,
  };
};
