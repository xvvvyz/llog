import { useCopyTargets } from '@/features/records/queries/use-copy-targets';
import { useNameSearch } from '@/hooks/use-name-search';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { getSpectrumBackgroundClassName } from '@/theme/spectrum-class-names';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { SearchInput } from '@/ui/search-input';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Text } from '@/ui/text';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export const LogTemplateCopyToSheet = () => {
  const sheetManager = useSheetManager();
  const templateId = sheetManager.getId('log-template-copy-to');
  const sourceLogId = sheetManager.getContext('log-template-copy-to');
  const open = sheetManager.isOpen('log-template-copy-to');
  const payload = sheetManager.getPayload('log-template-copy-to') ?? {};
  const hasTemplateTags = !!payload.hasTemplateTags;

  const [shouldCreateMissingTags, setShouldCreateMissingTags] =
    React.useState(false);

  const [query, setQuery] = React.useState('');

  const [selectedLogIds, setSelectedLogIds] = React.useState<Set<string>>(
    new Set()
  );

  const copyTargets = useCopyTargets({
    enabled: open && !!templateId,
    requireCanManage: true,
  });

  const targetLogs = React.useMemo(
    () => copyTargets.logs.filter((log) => log.id !== sourceLogId),
    [copyTargets.logs, sourceLogId]
  );

  const visibleLogs = useNameSearch(targetLogs, query);

  React.useEffect(() => {
    if (!open) return;
    setShouldCreateMissingTags(false);
    setSelectedLogIds(new Set());
    setQuery('');
  }, [open, templateId]);

  React.useEffect(() => {
    if (hasTemplateTags) return;
    setShouldCreateMissingTags(false);
  }, [hasTemplateTags]);

  const close = React.useCallback(() => {
    sheetManager.close('log-template-copy-to');
  }, [sheetManager]);

  const toggleLog = React.useCallback((logId: string) => {
    setSelectedLogIds((prev) => {
      const next = new Set(prev);

      if (next.has(logId)) next.delete(logId);
      else next.add(logId);

      return next;
    });
  }, []);

  const handleSubmit = React.useCallback(() => {
    if (!templateId || selectedLogIds.size === 0) return;

    sheetManager.open('log-template-copy-editor', templateId, undefined, {
      createMissingTags: hasTemplateTags && shouldCreateMissingTags,
      logIds: [...selectedLogIds],
    });
  }, [
    hasTemplateTags,
    selectedLogIds,
    shouldCreateMissingTags,
    sheetManager,
    templateId,
  ]);

  return (
    <Sheet
      onDismiss={close}
      open={open}
      portalName="log-template-copy-to"
      variant="list"
    >
      {(copyTargets.isLoading || !!visibleLogs.length) && (
        <SheetListScrollView loading={copyTargets.isLoading} variant="rows">
          {visibleLogs.map((log) => {
            const isSelected = selectedLogIds.has(log.id);

            return (
              <View
                key={log.id}
                className="flex-row items-center justify-between"
              >
                <View className="flex-1 flex-row min-w-0 gap-2 items-center">
                  <Avatar
                    avatar={log.team.image?.uri ?? undefined}
                    className="border-border-secondary border"
                    fallback="gradient"
                    id={log.team.id}
                    size={19}
                  />
                  <Text className="text-placeholder">/</Text>
                  <View
                    className={cn(
                      'size-4 border-continuous rounded-md shrink-0',
                      getSpectrumBackgroundClassName(log.color)
                    )}
                  />
                  <Text className="flex-1 min-w-0" numberOfLines={1}>
                    {log.name}
                  </Text>
                </View>
                <Checkbox
                  checked={isSelected}
                  className="size-8 border-0 shrink-0"
                  onCheckedChange={() => toggleLog(log.id)}
                />
              </View>
            );
          })}
        </SheetListScrollView>
      )}
      <SheetFooter contentClassName="gap-3">
        {hasTemplateTags && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: shouldCreateMissingTags }}
            className="flex-row py-1 gap-3 items-center"
            onPress={() => setShouldCreateMissingTags((value) => !value)}
          >
            <Checkbox
              checked={shouldCreateMissingTags}
              className="size-5 rounded-md shrink-0"
              emptyUnchecked
              onCheckedChange={setShouldCreateMissingTags}
              wrapperClassName="rounded-md border-continuous"
            />
            <Text className="flex-1 text-muted-foreground text-sm">
              Create missing tags
            </Text>
          </Pressable>
        )}
        <View className="flex-row gap-4">
          <SearchInput
            query={query}
            setQuery={setQuery}
            size="sm"
            wrapperClassName="flex-1 min-w-0"
          />
          <Button
            disabled={selectedLogIds.size === 0}
            onPress={handleSubmit}
            size="sm"
            wrapperClassName="shrink-0"
          >
            <Text>Next</Text>
          </Button>
        </View>
      </SheetFooter>
    </Sheet>
  );
};
