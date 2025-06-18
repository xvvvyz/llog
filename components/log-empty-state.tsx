import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { FolderPen, PencilLine, Tag } from 'lucide-react-native';
import { View } from 'react-native';

export const LogEmptyState = ({ logId }: { logId: string }) => {
  const sheetManager = useSheetManager();

  return (
    <View className="mx-auto w-full max-w-[13rem] flex-1 justify-center gap-3 px-3 py-8">
      <Button
        className="justify-between"
        onPress={() => sheetManager.open('log-edit', logId)}
        size="xs"
        variant="secondary"
      >
        <Text>Edit log details</Text>
        <Icon className="-mr-0.5" icon={FolderPen} size={16} />
      </Button>
      <Button
        className="justify-between"
        onPress={() => sheetManager.open('log-tags', logId)}
        size="xs"
        variant="secondary"
      >
        <Text>Manage log tags</Text>
        <Icon className="-mr-0.5" icon={Tag} size={16} />
      </Button>
      <Button
        className="justify-between"
        onPress={() => sheetManager.open('record-create', logId)}
        size="xs"
        variant="secondary"
      >
        <Text>New log record</Text>
        <Icon className="-mr-0.5" icon={PencilLine} size={16} />
      </Button>
    </View>
  );
};
