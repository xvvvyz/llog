import { useLogColor } from '@/features/logs/hooks/use-color';
import { createLogTag } from '@/features/logs/mutations/create-log-tag';
import { toggleLogTag } from '@/features/logs/mutations/toggle-log-tag';
import { useLog } from '@/features/logs/queries/use-log';
import { TagSheetContent } from '@/features/tags/components/tag-sheet-content';
import { useTagSheetController } from '@/features/tags/hooks/use-tag-sheet-controller';
import { reorderTags } from '@/features/tags/mutations/reorder-tags';
import type { Tag } from '@/features/tags/types/tag';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useUi } from '@/queries/use-ui';
import { Sheet } from '@/ui/sheet';
import * as React from 'react';

export const LogTagsSheet = () => {
  const sheetManager = useSheetManager();
  const ui = useUi();
  const log = useLog({ id: sheetManager.getId('log-tags') });
  const logColor = useLogColor({ id: log.id });
  const teamId = log.teamId ?? ui.activeTeamId;

  const tagSheet = useTagSheetController({
    buildPendingTag: React.useCallback(
      ({ id, name, order }) =>
        teamId ? ({ id, name, order, teamId, type: 'log' } as Tag) : null,
      [teamId]
    ),
    canCreateNewTag: !!teamId,
    onCreateTag: React.useCallback(
      ({ id, name, order }) => {
        if (!teamId) return;
        void createLogTag({ id, logId: log.id, name, order, teamId });
      },
      [log.id, teamId]
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
    log.isLoading ||
    (!tagSheet.query &&
      tagSheet.tagsIsLoading &&
      !tagSheet.hasPendingCreatedTag);

  return (
    <Sheet
      className="md:rounded-3xl"
      loading={isLoading}
      onDismiss={() => sheetManager.close('log-tags')}
      open={sheetManager.isOpen('log-tags')}
      portalName="log-tags"
    >
      <TagSheetContent
        canCreateTag={tagSheet.canCreateTag}
        checkedColor={logColor.default}
        getSelected={tagSheet.getSelected}
        isLoading={isLoading}
        onClose={() => sheetManager.close('log-tags')}
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
