import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { FolderPen, PencilLine, Tag } from 'lucide-react-native';
import { View } from 'react-native';

export const LogEmptyState = ({ logId }: { logId: string }) => {
  const sheetManager = useSheetManager();

  return (
    <View className="mx-auto w-full max-w-xs flex-1 justify-center gap-3 px-3 py-8">
      <Button
        className="justify-between gap-4"
        onPress={() => sheetManager.open('log-edit', logId)}
        variant="secondary"
      >
        <Text>Edit log name/color</Text>
        <Icon icon={FolderPen} className="text-placeholder" size={20} />
      </Button>
      <Button
        className="justify-between gap-4"
        onPress={() => sheetManager.open('log-tags', logId)}
        variant="secondary"
      >
        <Text>Manage log tags</Text>
        <Icon icon={Tag} className="text-placeholder" size={20} />
      </Button>
      <Button
        className="justify-between gap-4"
        onPress={() => sheetManager.open('record-create', logId)}
        variant="secondary"
      >
        <Text>New log record</Text>
        <Icon icon={PencilLine} className="text-placeholder" size={20} />
      </Button>
    </View>
  );
};
