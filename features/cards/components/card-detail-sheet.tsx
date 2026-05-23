import { ProgressCard } from '@/features/cards/components/progress-card';
import * as cardMutations from '@/features/cards/mutations/cards';
import { useLogCard, useLogCards } from '@/features/cards/queries/use-cards';
import { useLog } from '@/features/logs/queries/use-log';
import { useTags } from '@/features/tags/queries/use-tags';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { resolveSpectrumColor } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Text } from '@/ui/text';
import * as React from 'react';
import * as cardActionsMenu from '@/features/cards/components/card-actions-menu';

export const LogCardDetailSheet = () => {
  const sheetManager = useSheetManager();
  const isOpen = sheetManager.isOpen('log-card-detail');
  const cardId = sheetManager.getId('log-card-detail');
  const card = useLogCard({ enabled: isOpen, id: cardId });

  const cards = useLogCards({
    enabled: isOpen && !!card.logId,
    logId: card.logId ?? undefined,
  });

  const log = useLog({ id: card.logId ?? undefined });
  const myRole = useMyRole({ teamId: card.teamId ?? log.teamId ?? null });
  const resolvedTeamId = card.teamId ?? log.teamId ?? undefined;

  const recordTags = useTags({
    enabled: isOpen && !!card.logId && !!resolvedTeamId,
    logId: card.logId ?? undefined,
    teamIds: resolvedTeamId ? [resolvedTeamId] : undefined,
    type: 'record',
  });

  const title = card.title;
  const logColorIndex = resolveSpectrumColor(log.color);
  const [deletingCardId, setDeletingCardId] = React.useState<string>();

  const { isSubmitting: isDeleting, runSubmit: runDelete } =
    useSheetSubmitState({ isOpen: !!deletingCardId });

  const isGenerating = !!card.isGenerating;
  const hasMultipleCards = cards.data.length > 1;

  React.useEffect(() => {
    if (!isOpen) setDeletingCardId(undefined);
  }, [isOpen]);

  const handleDelete = React.useCallback(async () => {
    if (!deletingCardId) return;

    await runDelete(
      async ({ keepPendingUntilClose }) => {
        await cardMutations.deleteCard(deletingCardId);
        setDeletingCardId(undefined);
        sheetManager.close('log-card-detail');
        keepPendingUntilClose();
      },
      { suppressError: true }
    );
  }, [deletingCardId, runDelete, sheetManager]);

  const handleRefresh = React.useCallback(async () => {
    if (!card.id) return;
    await cardMutations.refreshCard(card.id);
  }, [card.id]);

  return (
    <>
      <Sheet
        onDismiss={() => sheetManager.close('log-card-detail')}
        open={isOpen}
        portalName="log-card-detail"
        topInset={64}
      >
        <SheetListScrollView
          className="max-h-none md:max-h-none"
          contentContainerClassName="mx-auto w-full max-w-lg p-8 md:p-8 items-stretch"
          loading={card.isLoading}
        >
          {!!card.id && !!title && (
            <ProgressCard
              chartTags={recordTags.data.length ? recordTags.data : card.tags}
              frame="none"
              logColorIndex={logColorIndex}
              output={card.output}
              variant="detail"
              actionMenu={
                myRole.canManage ? (
                  <cardActionsMenu.CardActionsMenu
                    isGenerating={isGenerating}
                    isTweakDisabled={!card.output}
                    onDelete={() => setDeletingCardId(card.id)}
                    onRefresh={handleRefresh}
                    onTweak={() => sheetManager.open('log-card-tweak', card.id)}
                    showGeneratingIndicator={!!card.output}
                    onCopy={() =>
                      sheetManager.open(
                        'log-card-copy-to',
                        card.id,
                        card.logId ?? undefined
                      )
                    }
                    onEdit={() =>
                      sheetManager.open(
                        'log-card-editor',
                        card.id,
                        card.logId ?? undefined
                      )
                    }
                    onManage={
                      hasMultipleCards
                        ? () =>
                            sheetManager.open(
                              'log-cards',
                              card.logId ?? undefined
                            )
                        : undefined
                    }
                  />
                ) : isGenerating && !!card.output ? (
                  <cardActionsMenu.CardGeneratingIndicator />
                ) : undefined
              }
              card={{
                error: card.error,
                isGenerating: card.isGenerating,
                tags: card.tags,
                title,
              }}
            />
          )}
        </SheetListScrollView>
        <SheetFooter contentClassName="md:px-8 md:py-4">
          <Button
            onPress={() => sheetManager.close('log-card-detail')}
            size="sm"
            variant="secondary"
          >
            <Text>Close</Text>
          </Button>
        </SheetFooter>
      </Sheet>
      <DestructiveConfirmSheet
        isPending={isDeleting}
        onConfirm={handleDelete}
        onDismiss={() => setDeletingCardId(undefined)}
        open={!!deletingCardId}
        portalName="log-card-detail-delete"
        title="Delete card?"
      />
    </>
  );
};
