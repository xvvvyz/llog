import { TemplateTagSummary } from '@/features/logs/components/template-tag-summary';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { reorderTemplates } from '@/features/logs/mutations/reorder-templates';
import { useLogTemplates } from '@/features/logs/queries/use-templates';
import type { LogTemplate } from '@/features/logs/types/template';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { nativePointerEvents } from '@/ui/pointer-events';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import * as Sortable from '@/ui/sortable';
import { SortableSheetDragHandle } from '@/ui/sortable';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import * as spectrumClassNames from '@/theme/spectrum-class-names';

import {
  ArrowBendUpRight,
  DotsThreeVertical,
  NotePencil,
  Trash,
} from 'phosphor-react-native';

const TemplateRow = ({
  onCopy,
  onDelete,
  onOpen,
  template,
}: {
  onCopy: () => void;
  onDelete: () => void;
  onOpen: () => void;
  template: LogTemplate;
}) => (
  <View className="relative h-10 w-full">
    <Button
      className="h-10 w-full"
      onPress={onOpen}
      size="sm"
      variant="secondary"
      wrapperClassName="absolute inset-0 w-full"
    />
    <View
      className="flex-row h-10 items-center web:pointer-events-none"
      style={nativePointerEvents.boxNone}
    >
      <SortableSheetDragHandle
        className="h-10 w-10 web:pointer-events-auto"
        contentClassName="h-10 w-10"
      />
      <View
        className="flex-1 flex-row min-w-0 gap-3 items-center web:pointer-events-none"
        style={nativePointerEvents.none}
      >
        <TemplateTagSummary tags={template.tags} />
        <Text
          className="flex-1 min-w-0 font-normal text-muted-foreground text-sm"
          numberOfLines={1}
        >
          {template.text}
        </Text>
      </View>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button
            accessibilityLabel="Template actions"
            size="icon-xs"
            variant="ghost"
            wrapperClassName="ml-2 mr-1 rounded-lg border-continuous web:pointer-events-auto"
          >
            <Icon
              className="text-muted-foreground"
              icon={DotsThreeVertical}
              size={18}
            />
          </Button>
        </Menu.Trigger>
        <Menu.Content align="end">
          <Menu.Item onPress={onOpen}>
            <Icon className="text-placeholder" icon={NotePencil} />
            <Text>Edit</Text>
          </Menu.Item>
          <Menu.Item onPress={onCopy}>
            <Icon className="text-placeholder" icon={ArrowBendUpRight} />
            <Text>Copy to</Text>
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item onPress={onDelete}>
            <Icon className="text-destructive" icon={Trash} />
            <Text className="text-destructive">Delete</Text>
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </View>
  </View>
);

export const LogTemplatesSheet = () => {
  const sheetManager = useSheetManager();
  const logId = sheetManager.getId('log-templates');
  const templates = useLogTemplates({ logId });
  const logColor = useLogColor({ id: logId });
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();

  const handleDragEnd = React.useCallback(
    (params: Sortable.SortableGridDragEndParams<LogTemplate>) => {
      void reorderTemplates({
        logId,
        orderedIds: params.data.map((template) => template.id),
      });
    },
    [logId]
  );

  const openTemplateEditor = React.useCallback(
    (templateId?: string) => {
      sheetManager.open('log-template-editor', templateId, logId);
    },
    [logId, sheetManager]
  );

  return (
    <Sheet
      onDismiss={() => sheetManager.close('log-templates')}
      open={sheetManager.isOpen('log-templates')}
      portalName="log-templates"
      variant="list"
    >
      <SheetListScrollView
        ref={scrollViewRef}
        loading={templates.isLoading}
        variant="rows"
      >
        {templates.data.length > 0 ? (
          <Sortable.SortableGrid
            autoScrollDirection="vertical"
            columns={1}
            data={templates.data}
            onDragEnd={handleDragEnd}
            rowGap={8}
            scrollableRef={scrollViewRef}
            renderItem={({ item }) => (
              <TemplateRow
                onOpen={() => openTemplateEditor(item.id)}
                template={item}
                onCopy={() =>
                  sheetManager.open('log-template-copy-to', item.id, logId, {
                    hasTemplateTags: !!item.tags?.length,
                  })
                }
                onDelete={() =>
                  sheetManager.open('log-template-delete', item.id)
                }
              />
            )}
          />
        ) : (
          <Text className="mx-auto max-w-56 text-center text-muted-foreground md:py-6">
            Create reusable templates for new records in this log.
          </Text>
        )}
      </SheetListScrollView>
      <SheetFooter contentClassName="flex-row gap-4">
        <Button
          onPress={() => sheetManager.close('log-templates')}
          size="sm"
          variant="secondary"
          wrapperClassName="flex-1"
        >
          <Text>Close</Text>
        </Button>
        <Button
          disabled={!logId}
          onPress={() => openTemplateEditor()}
          size="sm"
          variant="secondary"
          wrapperClassName="flex-1"
          className={spectrumClassNames.getSpectrumBackgroundClassName(
            logColor.colorIndex
          )}
          interactiveClassName={cn(
            'active:opacity-90 web:hover:opacity-90',
            spectrumClassNames.getSpectrumInteractiveBackgroundClassName(
              logColor.colorIndex
            )
          )}
        >
          <Text className="text-white">New</Text>
        </Button>
      </SheetFooter>
    </Sheet>
  );
};
