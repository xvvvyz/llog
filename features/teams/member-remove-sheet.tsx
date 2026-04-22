import { useSheetManager } from '@/hooks/use-sheet-manager';
import { removeMember } from '@/mutations/remove-member';
import { useTeam } from '@/queries/use-team';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

export const MemberRemoveSheet = () => {
  const sheetManager = useSheetManager();
  const memberId = sheetManager.getId('member-remove');
  const team = useTeam();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleRemove = React.useCallback(async () => {
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
            <ActivityIndicator color={UI.light.contrastForeground} />
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
