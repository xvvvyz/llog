import { TemplateTagSummary } from '@/features/logs/components/template-tag-summary';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { reorderTemplates } from '@/features/logs/mutations/reorder-templates';
import { useLogTemplates } from '@/features/logs/queries/use-templates';
import type { LogTemplate } from '@/features/logs/types/template';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import * as Sortable from '@/ui/sortable';
import { SortableSheetDragHandle } from '@/ui/sortable';
import { Text } from '@/ui/text';
import { Trash } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

const TemplateRow = ({
  onDelete,
  onOpen,
  template,
}: {
  onDelete: () => void;
  onOpen: () => void;
  template: LogTemplate;
}) => (
  <View className="flex-row w-full px-0 gap-3 items-center">
    <View className="flex-1 flex-row overflow-hidden min-w-0 px-0 border-border-secondary border-continuous rounded-xl bg-secondary border items-center">
      <SortableSheetDragHandle
        className="h-10 w-10"
        contentClassName="h-10 w-10"
      />
      <Button
        className="flex-1 h-full min-w-0 px-0 rounded-none justify-start"
        onPress={onOpen}
        size="sm"
        variant="link"
        wrapperClassName="self-stretch flex-1 mr-2.5 rounded-none border-continuous"
      >
        <View className="flex-1 flex-row min-w-0 gap-3 items-center">
          <TemplateTagSummary tags={template.tags} />
          <Text
            className="flex-1 min-w-0 font-normal text-muted-foreground text-sm"
            numberOfLines={1}
          >
            {template.text}
          </Text>
        </View>
      </Button>
      <Button
        accessibilityLabel="Delete template"
        onPress={onDelete}
        size="icon-sm"
        variant="ghost"
        wrapperClassName="border-continuous"
      >
        <Icon className="text-muted-foreground" icon={Trash} size={18} />
      </Button>
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
      loading={templates.isLoading}
      onDismiss={() => sheetManager.close('log-templates')}
      open={sheetManager.isOpen('log-templates')}
      portalName="log-templates"
      variant="list"
    >
      {!templates.isLoading && (
        <SheetListScrollView ref={scrollViewRef} variant="rows">
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
      )}
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
          className="active:opacity-90 web:hover:opacity-90"
          disabled={!logId}
          onPress={() => openTemplateEditor()}
          size="sm"
          style={{ backgroundColor: logColor.default }}
          variant="secondary"
          wrapperClassName="flex-1"
        >
          <Text className="text-white">New</Text>
        </Button>
      </SheetFooter>
    </Sheet>
  );
};
