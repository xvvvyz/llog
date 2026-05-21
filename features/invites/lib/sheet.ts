import type { Invite } from '@/instant.entities';
import { getInviteUrl } from '@/features/invites/lib/url';
import type { SheetManager } from '@/hooks/use-sheet-manager';

export type InviteSheetLink = Pick<Invite, 'id' | 'teamId' | 'token'>;

export const openInviteSheet = (
  sheetManager: Pick<SheetManager, 'open'>,
  invite: InviteSheetLink
) => {
  sheetManager.open('invite', getInviteUrl(invite.token), undefined, {
    inviteId: invite.id,
    teamId: invite.teamId,
  });
};

export const getInviteSheetPayload = (
  payload: unknown
): { inviteId: string; teamId: string } | null => {
  if (!payload || typeof payload !== 'object') return null;
  const inviteId = (payload as { inviteId?: unknown }).inviteId;
  const teamId = (payload as { teamId?: unknown }).teamId;
  if (typeof inviteId !== 'string' || typeof teamId !== 'string') return null;
  return { inviteId, teamId };
};
