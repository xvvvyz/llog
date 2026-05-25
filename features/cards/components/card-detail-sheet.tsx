import { ProgressCard } from '@/features/cards/components/progress-card';
import * as cardMutations from '@/features/cards/mutations/cards';
import { useLogCard, useLogCards } from '@/features/cards/queries/use-cards';
import * as cardDisplay from '@/features/cards/lib/card-display';
import { useLog } from '@/features/logs/queries/use-log';
import { useTags } from '@/features/tags/queries/use-tags';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { resolveSpectrumColor } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Text } from '@/ui/text';
import * as React from 'react';
import { Platform, View } from 'react-native';
import * as cardActionsMenu from '@/features/cards/components/card-actions-menu';
import { CardPaginationButton } from '@/features/cards/components/card-pagination-button';

export const LogCardDetailSheet = () => {
  const breakpoints = useBreakpoints();
  const sheetManager = useSheetManager();
  const isOpen = sheetManager.isOpen('log-card-detail');
  const cardId = sheetManager.getId('log-card-detail');
  const card = useLogCard({ enabled: isOpen, id: cardId });
  const [logId, setLogId] = React.useState<string>();
  const activeLogId = card.logId ?? logId;

  const cards = useLogCards({
    enabled: isOpen && !!activeLogId,
    logId: activeLogId,
  });

  const log = useLog({ id: activeLogId });
  const myRole = useMyRole({ teamId: card.teamId ?? log.teamId ?? null });
  const resolvedTeamId = card.teamId ?? log.teamId ?? undefined;

  const recordTags = useTags({
    enabled: isOpen && !!activeLogId && !!resolvedTeamId,
    logId: activeLogId,
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
  const currentCardId = card.id ?? cardId;

  const detailCards = React.useMemo(
    () => cards.data.filter(cardDisplay.isDisplayableProgressCard),
    [cards.data]
  );

  const detailCardIndex = React.useMemo(
    () => detailCards.findIndex((item) => item.id === currentCardId),
    [currentCardId, detailCards]
  );

  const canPaginateCards = detailCards.length > 1 && detailCardIndex >= 0;
  const useDesktopPagination = Platform.OS === 'web' && breakpoints.md;
  const useFooterPagination = canPaginateCards && !useDesktopPagination;

  React.useEffect(() => {
    if (!isOpen) setDeletingCardId(undefined);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      setLogId(undefined);
      return;
    }

    if (card.logId) setLogId(card.logId);
  }, [card.logId, isOpen]);

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

  const openAdjacentCard = React.useCallback(
    (direction: -1 | 1) => {
      if (!canPaginateCards) return;
      const count = detailCards.length;
      const nextIndex = (detailCardIndex + direction + count) % count;
      const nextCardId = detailCards[nextIndex]?.id;
      if (!nextCardId || nextCardId === currentCardId) return;
      sheetManager.open('log-card-detail', nextCardId);
    },
    [
      canPaginateCards,
      currentCardId,
      detailCardIndex,
      detailCards,
      sheetManager,
    ]
  );

  const desktopPaginationAccessory =
    canPaginateCards && useDesktopPagination ? (
      <>
        <View className="absolute -left-14 top-1/2 rounded-full -translate-y-1/2 pointer-events-auto">
          <CardPaginationButton
            direction="previous"
            onPress={() => openAdjacentCard(-1)}
          />
        </View>
        <View className="absolute -right-14 top-1/2 rounded-full -translate-y-1/2 pointer-events-auto">
          <CardPaginationButton
            direction="next"
            onPress={() => openAdjacentCard(1)}
          />
        </View>
      </>
    ) : undefined;

  return (
    <>
      <Sheet
        desktopAccessory={desktopPaginationAccessory}
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
          {!!card.id &&
            !!title &&
            cardDisplay.hasDisplayableCardOutput(card.output) && (
              <ProgressCard
                card={{ tags: card.tags, title }}
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
                      onTweak={() =>
                        sheetManager.open('log-card-tweak', card.id)
                      }
                    />
                  ) : isGenerating && !!card.output ? (
                    <cardActionsMenu.CardGeneratingIndicator />
                  ) : undefined
                }
              />
            )}
        </SheetListScrollView>
        <SheetFooter
          contentClassName={
            useFooterPagination
              ? 'flex-row gap-4 md:px-8 md:py-4'
              : 'md:px-8 md:py-4'
          }
        >
          {useFooterPagination && (
            <CardPaginationButton
              direction="previous"
              onPress={() => openAdjacentCard(-1)}
            />
          )}
          <Button
            onPress={() => sheetManager.close('log-card-detail')}
            size="sm"
            variant="secondary"
            wrapperClassName={useFooterPagination ? 'flex-1' : undefined}
          >
            <Text>Close</Text>
          </Button>
          {useFooterPagination && (
            <CardPaginationButton
              direction="next"
              onPress={() => openAdjacentCard(1)}
            />
          )}
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
