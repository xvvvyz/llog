import { getInviteSheetPayload } from '@/features/invites/lib/sheet';
import { deleteInviteLink } from '@/features/invites/mutations/delete-link';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

export const InviteLinkDeleteSheet = () => {
  const sheetManager = useSheetManager();

  const payload = getInviteSheetPayload(
    sheetManager.getPayload('invite-link-delete')
  );

  const [isLoading, setIsLoading] = React.useState(false);
  const open = sheetManager.isOpen('invite-link-delete');

  React.useEffect(() => {
    if (open) setIsLoading(false);
  }, [open]);

  const handleInvalidate = React.useCallback(async () => {
    if (!payload) return;
    setIsLoading(true);

    try {
      await deleteInviteLink({ id: payload.inviteId });
      sheetManager.close('invite-link-delete');
      sheetManager.close('invite');
    } catch {
      setIsLoading(false);
      // noop
    }
  }, [payload, sheetManager]);

  return (
    <Sheet
      className="md:max-w-sm"
      onDismiss={() => sheetManager.close('invite-link-delete')}
      open={open}
      portalName="invite-link-delete"
    >
      <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 md:p-8">
        <Text className="text-2xl text-center">Invalidate invite link?</Text>
        <Button
          disabled={isLoading}
          onPress={handleInvalidate}
          variant="destructive"
          wrapperClassName="mt-12"
        >
          {isLoading ? <Spinner /> : <Text>Invalidate</Text>}
        </Button>
        <Button
          disabled={isLoading}
          onPress={() => sheetManager.close('invite-link-delete')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
