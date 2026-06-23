import { TruncatedText } from '@/features/records/components/truncated-text';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { PressPropagationBoundary } from '@/ui/press-propagation-boundary';
import { Text, TextContext } from '@/ui/text';
import { View } from 'react-native';
import * as notes from '@/features/logs/lib/notes';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { getSpectrumAccentTextClassName } from '@/theme/spectrum-class-names';

import {
  DotsThreeVertical,
  NotePencil,
  Notepad,
  Trash,
} from 'phosphor-react-native';

const LogNotesMenu = ({
  logId,
  noteId,
  teamId,
}: {
  logId: string;
  noteId?: string;
  teamId?: string | null;
}) => {
  const sheetManager = useSheetManager();

  return (
    <PressPropagationBoundary>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button
            accessibilityLabel="Note actions"
            className="size-8 rounded-lg"
            size="icon"
            variant="ghost"
            wrapperClassName="rounded-lg"
          >
            <Icon className="text-muted-foreground" icon={DotsThreeVertical} />
          </Button>
        </Menu.Trigger>
        <Menu.Content align="end">
          <Menu.Item onPress={() => sheetManager.open('log-notes', logId)}>
            <Icon className="text-placeholder" icon={NotePencil} />
            <Text>Edit</Text>
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item
            onPress={() =>
              sheetManager.open('log-notes-delete', logId, undefined, {
                noteId,
                teamId: teamId ?? undefined,
              })
            }
          >
            <Icon className="text-destructive" icon={Trash} />
            <Text className="text-destructive">Delete</Text>
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </PressPropagationBoundary>
  );
};

export const LogNotesPreview = ({
  canManage,
  logId,
  note,
}: {
  canManage?: boolean;
  logId?: string;
  note?: { id?: string; teamId?: string | null; text?: string | null };
}) => {
  const logColor = useLogColor({ id: logId });

  const accentTextClassName = getSpectrumAccentTextClassName(
    logColor.colorIndex
  );

  const text = notes.getLogNoteDisplayText(note?.text);
  if (!logId || !notes.canShowLogNotesPreview({ canManage, text })) return null;

  return (
    <Card className="relative overflow-hidden mb-4">
      <View className="flex-col w-full pb-3.5 pt-4 px-4 gap-2 items-start">
        <TextContext.Provider value={undefined}>
          <View className="relative flex-row pl-[21px] pr-10 items-baseline">
            <Text className="leading-snug text-muted-foreground text-sm">
              Notes
            </Text>
            <View className="absolute -left-px bottom-0 top-0 w-4 items-center justify-center">
              <Icon
                className="text-muted-foreground"
                icon={Notepad}
                size={16}
              />
            </View>
          </View>
          <TruncatedText
            actionClassName="px-0"
            className="select-text web:text-pretty"
            linkClassName={accentTextClassName}
            numberOfLines={3}
            text={text}
          />
        </TextContext.Provider>
      </View>
      <View className="absolute right-4 top-4 z-10">
        <View className="max-w-52 items-end shrink">
          <View className="flex-row -mr-1.5 -mt-1.5 gap-1 items-center justify-end">
            <LogNotesMenu
              logId={logId}
              noteId={note?.id}
              teamId={note?.teamId}
            />
          </View>
        </View>
      </View>
    </Card>
  );
};
