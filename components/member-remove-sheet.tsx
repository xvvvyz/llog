import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { removeMember } from '@/mutations/remove-member';
import { useTeam } from '@/queries/use-team';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export const MemberRemoveSheet = () => {
  const sheetManager = useSheetManager();
  const memberId = sheetManager.getId('member-remove');
  const team = useTeam();
  const [isLoading, setIsLoading] = useState(false);

  const handleRemove = useCallback(async () => {
    if (!memberId || !team.id) return;
    setIsLoading(true);

    try {
      await removeMember({ teamId: team.id, roleId: memberId });
      sheetManager.close('member-remove');
    } finally {
      setIsLoading(false);
    }
  }, [memberId, team.id, sheetManager]);

  return (
    <Sheet
      onDismiss={() => sheetManager.close('member-remove')}
      open={sheetManager.isOpen('member-remove')}
      portalName="member-remove"
    >
      <View className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">Remove member?</Text>
        <Button
          disabled={isLoading}
          onPress={handleRemove}
          variant="destructive"
          wrapperClassName="mt-12"
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text>Remove</Text>
          )}
        </Button>
        <Button
          onPress={() => sheetManager.close('member-remove')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
