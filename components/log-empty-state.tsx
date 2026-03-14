import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { useMyRole } from '@/queries/use-my-role';
import { NotePencil, PencilLine, Tag } from 'phosphor-react-native';
import { View } from 'react-native';

export const LogEmptyState = ({ logId }: { logId: string }) => {
  const { canManage } = useMyRole();
  const sheetManager = useSheetManager();

  return (
    <View className="mx-auto w-full max-w-[13rem] flex-1 justify-center gap-3 px-3 py-8">
      {canManage && (
        <>
          <Button
            className="justify-between"
            onPress={() => sheetManager.open('log-edit', logId)}
            size="xs"
            variant="secondary"
          >
            <Text>Edit details</Text>
            <Icon className="-mr-0.5" icon={NotePencil} size={18} />
          </Button>
          <Button
            className="justify-between"
            onPress={() => sheetManager.open('log-tags', logId)}
            size="xs"
            variant="secondary"
          >
            <Text>Manage tags</Text>
            <Icon className="-mr-0.5" icon={Tag} size={18} />
          </Button>
        </>
      )}
      <Button
        className="justify-between"
        onPress={() => sheetManager.open('record-create', logId)}
        size="xs"
        variant="secondary"
      >
        <Text>New record</Text>
        <Icon className="-mr-0.5" icon={PencilLine} size={18} />
      </Button>
    </View>
  );
};
