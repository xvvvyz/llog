import { openInviteLinkSheet } from '@/features/invites/lib/sheet';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import * as inputGroup from '@/ui/input-group';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { LinkBreak, Plus } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

export type InviteLinkFieldInvite = {
  id: string;
  teamId?: string | null;
  token?: string | null;
};

type InviteLinkFieldSize = 'sm' | 'xs';
type InviteLinkFieldIconPosition = 'leading' | 'trailing';

const waitForPendingPaint = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 0);
  });

export const InviteLinkField = ({
  className,
  createLabel = 'Create invite link',
  disabled,
  fullWidth = true,
  iconPosition = 'leading',
  invite,
  isLoading,
  onGetOrCreateInvite,
  size = 'xs',
  teamId,
  viewLabel = 'Invite link',
}: {
  className?: string;
  createLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  iconPosition?: InviteLinkFieldIconPosition;
  invite?: InviteLinkFieldInvite;
  isLoading?: boolean;
  onGetOrCreateInvite: () => Promise<InviteLinkFieldInvite | null | undefined>;
  size?: InviteLinkFieldSize;
  teamId?: string | null;
  viewLabel?: string;
}) => {
  const sheetManager = useSheetManager();
  const isXs = size === 'xs';
  const hasTrailingIcon = iconPosition === 'trailing';
  const alignWithSearch = fullWidth && !isXs && !hasTrailingIcon;
  const [isCreatingInvite, setIsCreatingInvite] = React.useState(false);

  const [createdInvite, setCreatedInvite] =
    React.useState<InviteLinkFieldInvite>();

  const [deletedInviteId, setDeletedInviteId] = React.useState<string>();
  const queryInvite = invite?.id === deletedInviteId ? undefined : invite;

  const localInvite =
    createdInvite?.id === deletedInviteId ? undefined : createdInvite;

  const activeInvite = queryInvite ?? localInvite;
  const inviteTeamId = activeInvite?.teamId ?? teamId;
  const canInvalidateInvite = !!activeInvite?.id && !!inviteTeamId;

  const primaryButtonDisabled = activeInvite
    ? !activeInvite.token || isCreatingInvite || disabled || !teamId
    : isCreatingInvite || isLoading || disabled || !teamId;

  const primaryLabel =
    activeInvite && !isCreatingInvite ? viewLabel : createLabel;

  const showPrimarySpinner = isCreatingInvite || (!activeInvite && isLoading);

  React.useEffect(() => {
    setCreatedInvite(undefined);
    setDeletedInviteId(undefined);
  }, [teamId]);

  React.useEffect(() => {
    if (invite?.id && invite.id !== deletedInviteId) {
      setCreatedInvite(undefined);
    }
  }, [deletedInviteId, invite?.id]);

  const getOrCreateActiveInvite = React.useCallback(async (): Promise<
    InviteLinkFieldInvite & { token: string }
  > => {
    const nextInvite = await onGetOrCreateInvite();

    if (!nextInvite?.id || !nextInvite.token) {
      throw new Error('Failed to create invite link');
    }

    const nextActiveInvite: InviteLinkFieldInvite & { token: string } = {
      ...nextInvite,
      token: nextInvite.token,
      teamId: nextInvite.teamId ?? teamId,
    };

    setDeletedInviteId(undefined);
    setCreatedInvite(nextActiveInvite);
    return nextActiveInvite;
  }, [onGetOrCreateInvite, teamId]);

  const handleDeletedInvite = React.useCallback((inviteId: string) => {
    setDeletedInviteId(inviteId);

    setCreatedInvite((current) =>
      current?.id === inviteId ? undefined : current
    );
  }, []);

  const handleOpenInviteLink = React.useCallback(async () => {
    if (
      isCreatingInvite ||
      disabled ||
      !teamId ||
      (!activeInvite && isLoading)
    ) {
      return;
    }

    if (activeInvite?.id && inviteTeamId && activeInvite.token) {
      openInviteLinkSheet(sheetManager, {
        id: activeInvite.id,
        onDeleted: handleDeletedInvite,
        teamId: inviteTeamId,
        token: activeInvite.token,
      });

      return;
    }

    setIsCreatingInvite(true);

    try {
      await waitForPendingPaint();
      const nextInvite = await getOrCreateActiveInvite();
      if (!nextInvite?.id || !nextInvite.teamId || !nextInvite.token) return;

      openInviteLinkSheet(sheetManager, {
        id: nextInvite.id,
        onDeleted: handleDeletedInvite,
        teamId: nextInvite.teamId,
        token: nextInvite.token,
      });
    } finally {
      setIsCreatingInvite(false);
    }
  }, [
    activeInvite,
    disabled,
    getOrCreateActiveInvite,
    handleDeletedInvite,
    inviteTeamId,
    isCreatingInvite,
    isLoading,
    sheetManager,
    teamId,
  ]);

  const handleInvalidateInvite = React.useCallback(() => {
    if (!activeInvite?.id || !inviteTeamId) return;

    sheetManager.open('invite-link-delete', undefined, undefined, {
      inviteId: activeInvite.id,
      onDeleted: handleDeletedInvite,
      teamId: inviteTeamId,
    });
  }, [activeInvite, handleDeletedInvite, inviteTeamId, sheetManager]);

  if (!teamId) return null;

  return (
    <inputGroup.InputGroup className={className} size={size}>
      <Button
        disabled={primaryButtonDisabled}
        onPress={handleOpenInviteLink}
        size={size}
        variant="ghost"
        className={cn(
          'h-full min-w-0 rounded-none',
          fullWidth && 'flex-1',
          isXs && fullWidth && 'justify-start',
          alignWithSearch && 'justify-start gap-0 px-0',
          hasTrailingIcon && !isXs && 'justify-start gap-3 px-3'
        )}
        wrapperClassName={cn(
          'h-full min-w-0 rounded-none',
          fullWidth && 'flex-1'
        )}
      >
        {alignWithSearch ? (
          <View className="w-10 items-center justify-center">
            {showPrimarySpinner ? (
              <Spinner size="xs" />
            ) : (
              <Icon
                className="ml-0.5 text-muted-foreground"
                icon={Plus}
                size={20}
              />
            )}
          </View>
        ) : hasTrailingIcon ? null : showPrimarySpinner ? (
          <Spinner size={isXs ? 'xxs' : 'xs'} />
        ) : (
          <Icon
            className="text-muted-foreground"
            icon={Plus}
            size={isXs ? 16 : undefined}
          />
        )}
        <Text
          numberOfLines={1}
          className={cn(
            'min-w-0',
            fullWidth && 'flex-1',
            isXs
              ? 'native:leading-5'
              : 'text-base native:leading-5 native:text-base'
          )}
        >
          {primaryLabel}
        </Text>
        {hasTrailingIcon &&
          (showPrimarySpinner ? (
            <Spinner size={isXs ? 'xxs' : 'xs'} />
          ) : (
            <Icon
              className="text-muted-foreground"
              icon={Plus}
              size={isXs ? 16 : undefined}
            />
          ))}
      </Button>
      <Button
        accessibilityLabel="Invalidate invite link"
        className="h-full rounded-none"
        disabled={!canInvalidateInvite || isCreatingInvite || disabled}
        onPress={handleInvalidateInvite}
        size={isXs ? 'icon-xs' : 'icon-sm'}
        variant="ghost"
        wrapperClassName="h-full shrink-0 rounded-none border-l border-border-secondary"
      >
        <Icon icon={LinkBreak} size={isXs ? 16 : undefined} />
      </Button>
    </inputGroup.InputGroup>
  );
};
