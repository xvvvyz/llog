import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { Role } from '@/enums/roles';
import { useTeamInviteLinks } from '@/queries/use-team-invite-links';
import { db } from '@/utilities/db';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export const InviteDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const role = sheetManager.getId('invite-delete');
  const { inviteLinks } = useTeamInviteLinks();
  const [isLoading, setIsLoading] = useState(false);

  const label =
    role === Role.Admin
      ? 'Invalidate invite link?'
      : 'Invalidate invite links?';

  const handleInvalidate = useCallback(async () => {
    setIsLoading(true);

    try {
      const toDelete = inviteLinks.filter((l) => l.role === role);

      if (toDelete.length) {
        await db.transact(
          toDelete.map((l) => db.tx.inviteLinks[l.id].delete())
        );
      }

      sheetManager.close('invite-delete');
    } finally {
      setIsLoading(false);
    }
  }, [inviteLinks, role, sheetManager]);

  return (
    <Sheet
      onDismiss={() => sheetManager.close('invite-delete')}
      open={sheetManager.isOpen('invite-delete')}
      portalName="invite-delete"
    >
      <View className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">{label}</Text>
        <Button
          disabled={isLoading}
          onPress={handleInvalidate}
          variant="destructive"
          wrapperClassName="mt-12"
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
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
