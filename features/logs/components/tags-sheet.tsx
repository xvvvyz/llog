import { useUi } from '@/features/account/queries/use-ui';
import { createLogTag } from '@/features/logs/mutations/create-log-tag';
import { toggleLogTag } from '@/features/logs/mutations/toggle-log-tag';
import { useLog } from '@/features/logs/queries/use-log';
import { TagSheetContent } from '@/features/tags/components/tag-sheet-content';
import { useTagSheetController } from '@/features/tags/hooks/use-tag-sheet-controller';
import { reorderTags } from '@/features/tags/mutations/reorder-tags';
import { updateTag } from '@/features/tags/mutations/update-tag';
import type { Tag } from '@/features/tags/types/tag';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { resolveSpectrumColor, type Color } from '@/theme/spectrum';
import { Sheet } from '@/ui/sheet';
import * as React from 'react';

export const LogTagsSheet = () => {
  const sheetManager = useSheetManager();
  const ui = useUi();
  const log = useLog({ id: sheetManager.getId('log-tags') });
  const logColorIndex = resolveSpectrumColor(log.color);
  const teamId = log.teamId ?? ui.activeTeamId;

  const handleColorChange = React.useCallback((tagId: string, color: Color) => {
    void updateTag({ id: tagId, color });
  }, []);

  const tagSheet = useTagSheetController({
    buildPendingTag: React.useCallback(
      ({ id, name, order }) =>
        teamId
          ? ({
              color: logColorIndex,
              id,
              name,
              order,
              teamId,
              type: 'log',
            } as Tag)
          : null,
      [logColorIndex, teamId]
    ),
    canCreateNewTag: !!teamId,
    onCreateTag: React.useCallback(
      ({ id, name, order }) => {
        if (!teamId) return;

        void createLogTag({
          color: logColorIndex,
          id,
          logId: log.id,
          name,
          order,
          teamId,
        });
      },
      [log.id, logColorIndex, teamId]
    ),
    onReorder: React.useCallback((orderedTags: Tag[]) => {
      void reorderTags({ orderedIds: orderedTags.map((tag) => tag.id) });
    }, []),
    onToggleTag: React.useCallback(
      async (tagId: string, selected: boolean) => {
        await toggleLogTag({ tagId, selected, logId: log.id });
      },
      [log.id]
    ),
    scopeKey: log.id,
    selectedIds: log.tagIdsSet,
  });

  const isLoading =
    log.isLoading || (tagSheet.tagsIsLoading && !tagSheet.hasPendingCreatedTag);

  return (
    <Sheet
      loading={isLoading}
      onDismiss={() => sheetManager.close('log-tags')}
      open={sheetManager.isOpen('log-tags')}
      portalName="log-tags"
      variant="list"
    >
      <TagSheetContent
        canCreateTag={tagSheet.canCreateTag}
        canManageColor
        defaultTagColor={logColorIndex}
        getSelected={tagSheet.getSelected}
        isLoading={isLoading}
        onClose={() => sheetManager.close('log-tags')}
        onColorChange={handleColorChange}
        onReorder={tagSheet.handleReorder}
        onSelectTag={tagSheet.handleSelectTag}
        onSubmitTag={tagSheet.handleSubmitTag}
        query={tagSheet.query}
        rawQuery={tagSheet.rawQuery}
        setRawQuery={tagSheet.setRawQuery}
        sortEnabled={!tagSheet.rawQuery}
        visibleTags={tagSheet.visibleTags}
      />
    </Sheet>
  );
};
