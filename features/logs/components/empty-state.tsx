import { useLogColor } from '@/features/logs/hooks/use-color';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { View } from 'react-native';
import { NotePencil, UsersThree } from 'phosphor-react-native';
import * as spectrumClassNames from '@/theme/spectrum-class-names';

type EmptyStateProps = {
  canManage: boolean;
  logId: string;
  showManagerActions?: boolean;
  teamId: string;
};

export const EmptyState = ({
  canManage,
  logId,
  showManagerActions = canManage,
  teamId,
}: EmptyStateProps) => {
  const logColor = useLogColor({ id: logId });
  const sheetManager = useSheetManager();

  return (
    <View className="flex-1 mx-auto max-w-52 w-full px-3 py-8 gap-3 justify-center">
      {showManagerActions ? (
        <>
          <Button
            className="justify-between"
            disabled={!canManage}
            onPress={() => sheetManager.open('log-edit', logId)}
            size="xs"
            variant="secondary"
            wrapperClassName="w-32 self-center"
          >
            <Text>Edit</Text>
            <Icon className="-mr-0.5" icon={NotePencil} />
          </Button>
          <Button
            className="justify-between"
            disabled={!canManage}
            onPress={() => sheetManager.open('log-members', logId)}
            size="xs"
            variant="secondary"
            wrapperClassName="w-32 self-center"
          >
            <Text>Members</Text>
            <Icon className="-mr-0.5" icon={UsersThree} />
          </Button>
        </>
      ) : null}
      <Button
        size="xs"
        wrapperClassName="w-32 self-center"
        className={spectrumClassNames.getSpectrumBackgroundClassName(
          logColor.colorIndex
        )}
        interactiveClassName={cn(
          'active:opacity-90 web:hover:opacity-90',
          spectrumClassNames.getSpectrumInteractiveBackgroundClassName(
            logColor.colorIndex
          )
        )}
        onPress={() =>
          sheetManager.open('record-create', logId, undefined, { teamId })
        }
      >
        <Text className="text-white">Record</Text>
      </Button>
    </View>
  );
};
