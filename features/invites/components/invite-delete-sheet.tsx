import { useTeamInvites } from '@/features/invites/queries/use-team-invite-links';
import { Role } from '@/features/teams/types/role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

export const InviteDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const role = sheetManager.getId('invite-delete');
  const { invites } = useTeamInvites();
  const [isLoading, setIsLoading] = React.useState(false);
  const open = sheetManager.isOpen('invite-delete');

  React.useEffect(() => {
    if (open) setIsLoading(false);
  }, [open]);

  const label =
    role === Role.Admin
      ? 'Invalidate invite link?'
      : 'Invalidate invite links?';

  const handleInvalidate = React.useCallback(async () => {
    setIsLoading(true);

    try {
      const toDelete = invites.filter((l) => l.role === role);

      if (toDelete.length) {
        await db.transact(toDelete.map((l) => db.tx.invites[l.id].delete()));
      }

      sheetManager.close('invite-delete');
    } catch {
      setIsLoading(false);
    }
  }, [invites, role, sheetManager]);

  return (
    <Sheet
      onDismiss={() => sheetManager.close('invite-delete')}
      open={open}
      portalName="invite-delete"
    >
      <View className="mx-auto max-w-md w-full p-8">
        <Text className="text-2xl text-center">{label}</Text>
        <Button
          disabled={isLoading}
          onPress={handleInvalidate}
          variant="destructive"
          wrapperClassName="mt-12"
        >
          {isLoading ? (
            <ActivityIndicator color={UI.light.contrastForeground} />
          ) : (
            <Text>Invalidate</Text>
          )}
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
