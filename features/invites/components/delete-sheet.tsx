import { Role } from '@/domain/teams/role';
import { useTeamInvites } from '@/features/invites/queries/use-team-links';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { db } from '@/lib/db';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

export const InviteDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const role = sheetManager.getId('invite-delete');
  const { invites } = useTeamInvites();
  const open = sheetManager.isOpen('invite-delete');

  const { isSubmitting: isLoading, runSubmit } = useSheetSubmitState({
    isOpen: open,
  });

  const label =
    role === Role.Admin
      ? 'Invalidate invite link?'
      : 'Invalidate invite links?';

  const handleInvalidate = React.useCallback(async () => {
    await runSubmit(
      async ({ keepPendingUntilClose }) => {
        const toDelete = invites.filter((l) => l.role === role);

        if (toDelete.length) {
          await db.transact(toDelete.map((l) => db.tx.invites[l.id].delete()));
        }

        sheetManager.close('invite-delete');
        keepPendingUntilClose();
      },
      { suppressError: true }
    );
  }, [invites, role, runSubmit, sheetManager]);

  return (
    <Sheet
      className="md:max-w-sm"
      onDismiss={() => sheetManager.close('invite-delete')}
      open={open}
      portalName="invite-delete"
    >
      <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 md:p-8">
        <Text className="text-2xl text-center">{label}</Text>
        <Button
          disabled={isLoading}
          onPress={handleInvalidate}
          variant="destructive"
          wrapperClassName="mt-12"
        >
          {isLoading ? <Spinner /> : <Text>Invalidate</Text>}
        </Button>
        <Button
          onPress={() => sheetManager.close('invite-delete')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
