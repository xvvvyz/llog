import { Dots } from '@/features/files/components/carousel/dots';
import * as cardMutations from '@/features/cards/mutations/cards';
import type { LogCard } from '@/features/cards/types/card';
import { useTags } from '@/features/tags/queries/use-tags';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { clampIndex } from '@/lib/clamp';
import { cn } from '@/lib/cn';
import { resolveSpectrumColor } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';
import { Icon } from '@/ui/icon';
import { CaretLeft, CaretRight } from 'phosphor-react-native';
import * as React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import * as cardActionsMenu from '@/features/cards/components/card-actions-menu';
import * as progressCard from '@/features/cards/components/progress-card';

import ReanimatedCarousel, {
  type ICarouselInstance,
} from 'react-native-reanimated-carousel';

const LIST_MAX_WIDTH = 512;
const LIST_SIDE_PADDING = 16;
const CARD_GAP = 16;
const CARD_SIDE_PADDING = CARD_GAP / 2;
const CARD_ARROW_SIZE = 40;
const CARD_CONTROL_EDGE_INSET = 6;

const useCardPreviewActions = ({ logId }: { logId?: string }) => {
  const sheetManager = useSheetManager();
  const [deletingCardId, setDeletingCardId] = React.useState<string>();

  const { isSubmitting: isDeleting, runSubmit: runDelete } =
    useSheetSubmitState({ isOpen: !!deletingCardId });

  React.useEffect(() => {
    setDeletingCardId(undefined);
  }, [logId]);

  const openEditor = React.useCallback(
    (cardId: string) => {
      sheetManager.open('log-card-editor', cardId, logId);
    },
    [logId, sheetManager]
  );

  const openTweak = React.useCallback(
    (cardId: string) => {
      sheetManager.open('log-card-tweak', cardId);
    },
    [sheetManager]
  );

  const openCopy = React.useCallback(
    (cardId: string) => {
      sheetManager.open('log-card-copy-to', cardId, logId);
    },
    [logId, sheetManager]
  );

  const handleRefresh = React.useCallback(
    (cardId: string) => cardMutations.refreshCard(cardId),
    []
  );

  const handleDelete = React.useCallback(async () => {
    if (!deletingCardId) return;

    await runDelete(
      async ({ keepPendingUntilClose }) => {
        await cardMutations.deleteCard(deletingCardId);
        setDeletingCardId(undefined);
        keepPendingUntilClose();
      },
      { suppressError: true }
    );
  }, [deletingCardId, runDelete]);

  return {
    deletingCardId,
    handleDelete,
    handleRefresh,
    isDeleting,
    openCopy,
    openEditor,
    openTweak,
    setDeletingCardId,
    sheetManager,
  };
};

export const CardsHeader = ({
  cards,
  logColor,
  logId,
  teamId,
}: {
  cards: LogCard[];
  logColor?: number | null;
  logId?: string;
  teamId?: string | null;
}) => {
  const windowDimensions = useWindowDimensions();
  const carouselRef = React.useRef<ICarouselInstance>(null);
  const activeIndexRef = React.useRef(0);
  const activeCardIdRef = React.useRef<string | undefined>(undefined);
  const carouselScrollStartIndexRef = React.useRef<number | null>(null);
  const didCarouselMoveRef = React.useRef(false);
  const suppressCardPressRef = React.useRef(false);

  const suppressCardPressTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const activeIndex = useSharedValue(0);
  const [activeIndexState, setActiveIndexState] = React.useState(0);

  const visibleCards = React.useMemo(
    () => cards.filter((card) => card.type === 'progress'),
    [cards]
  );

  const myRole = useMyRole({
    teamId: visibleCards[0]?.teamId ?? teamId ?? null,
  });

  const cardActions = useCardPreviewActions({ logId });
  const logColorIndex = resolveSpectrumColor(logColor);
  const resolvedTeamId = visibleCards[0]?.teamId ?? teamId ?? undefined;

  const recordTags = useTags({
    enabled: !!logId && !!resolvedTeamId,
    logId,
    teamIds: resolvedTeamId ? [resolvedTeamId] : undefined,
    type: 'record',
  });

  const viewportWidth = Math.max(1, windowDimensions.width);
  const pageWidth = Math.max(1, Math.min(viewportWidth, LIST_MAX_WIDTH));
  const carouselPageWidth = Math.max(1, pageWidth - LIST_SIDE_PADDING);
  const sideOverflow = Math.max(0, (viewportWidth - pageWidth) / 2);
  const carouselOuterMargin = -(sideOverflow + LIST_SIDE_PADDING);
  const previousCarouselPageWidthRef = React.useRef(carouselPageWidth);
  const previousVisibleCardCountRef = React.useRef(visibleCards.length);
  const cardHeight = progressCard.PROGRESS_CARD_PREVIEW_HEIGHT;

  const controlsWidth = Math.max(
    CARD_ARROW_SIZE * 2,
    pageWidth - LIST_SIDE_PADDING * 2 - CARD_CONTROL_EDGE_INSET * 2
  );

  const syncCardIndex = React.useCallback(
    (index: number) => {
      const nextIndex = clampIndex(index, visibleCards.length);
      activeIndex.value = nextIndex;
      activeIndexRef.current = nextIndex;
      activeCardIdRef.current = visibleCards[nextIndex]?.id;
      setActiveIndexState(nextIndex);
      return nextIndex;
    },
    [activeIndex, visibleCards]
  );

  const setCardIndex = React.useCallback(
    (index: number, animated = true) => {
      const nextIndex = syncCardIndex(index);
      carouselRef.current?.scrollTo({ animated, index: nextIndex });
    },
    [syncCardIndex]
  );

  const markNextCardPressSuppressed = React.useCallback(() => {
    if (suppressCardPressTimeoutRef.current) {
      clearTimeout(suppressCardPressTimeoutRef.current);
    }

    suppressCardPressRef.current = true;

    suppressCardPressTimeoutRef.current = setTimeout(() => {
      suppressCardPressRef.current = false;
      suppressCardPressTimeoutRef.current = null;
    }, 250);
  }, []);

  const handleCardPress = React.useCallback(
    (cardId: string) => {
      if (suppressCardPressRef.current || didCarouselMoveRef.current) {
        suppressCardPressRef.current = false;
        carouselScrollStartIndexRef.current = null;
        didCarouselMoveRef.current = false;
        return;
      }

      cardActions.sheetManager.open('log-card-detail', cardId);
    },
    [cardActions.sheetManager]
  );

  const handleCardCarouselProgressChange = React.useCallback(
    (_offsetProgress: number, absoluteProgress: number) => {
      if (!Number.isFinite(absoluteProgress)) return;
      activeIndex.value = absoluteProgress;
      const scrollStartIndex = carouselScrollStartIndexRef.current;

      if (
        scrollStartIndex != null &&
        Math.abs(absoluteProgress - scrollStartIndex) > 0.02
      ) {
        didCarouselMoveRef.current = true;
      }

      const nextIndex = clampIndex(
        Math.round(absoluteProgress),
        visibleCards.length
      );

      const nextCardId = visibleCards[nextIndex]?.id;

      if (
        nextIndex === activeIndexRef.current &&
        nextCardId === activeCardIdRef.current
      ) {
        return;
      }

      syncCardIndex(nextIndex);
    },
    [activeIndex, syncCardIndex, visibleCards]
  );

  const handleCardCarouselScrollStart = React.useCallback(() => {
    carouselScrollStartIndexRef.current = activeIndexRef.current;
    didCarouselMoveRef.current = false;
  }, []);

  const handleCardCarouselScrollEnd = React.useCallback(
    (index: number) => {
      syncCardIndex(index);
      if (didCarouselMoveRef.current) markNextCardPressSuppressed();
      carouselScrollStartIndexRef.current = null;
      didCarouselMoveRef.current = false;
    },
    [markNextCardPressSuppressed, syncCardIndex]
  );

  React.useEffect(() => {
    return () => {
      if (!suppressCardPressTimeoutRef.current) return;
      clearTimeout(suppressCardPressTimeoutRef.current);
    };
  }, []);

  React.useEffect(() => {
    const previousCount = previousVisibleCardCountRef.current;
    previousVisibleCardCountRef.current = visibleCards.length;

    if (!visibleCards.length) {
      syncCardIndex(0);
      return;
    }

    const currentCardId = activeCardIdRef.current;

    const preservedIndex = currentCardId
      ? visibleCards.findIndex((card) => card.id === currentCardId)
      : -1;

    const nextIndex =
      preservedIndex !== -1
        ? preservedIndex
        : clampIndex(activeIndexRef.current, visibleCards.length);

    const nextCardId = visibleCards[nextIndex]?.id;
    const didShrink = visibleCards.length < previousCount;

    if (
      !didShrink &&
      nextIndex === activeIndexState &&
      nextCardId === currentCardId
    ) {
      return;
    }

    syncCardIndex(nextIndex);

    requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({ animated: false, index: nextIndex });
    });
  }, [activeIndexState, syncCardIndex, visibleCards]);

  React.useEffect(() => {
    if (previousCarouselPageWidthRef.current === carouselPageWidth) return;
    previousCarouselPageWidthRef.current = carouselPageWidth;
    setCardIndex(activeIndexRef.current, false);
  }, [carouselPageWidth, setCardIndex]);

  const renderCard = React.useCallback(
    ({ item: card }: { item: LogCard }) => {
      const isGenerating = !!card.isGenerating;

      return (
        <View
          style={{
            height: cardHeight,
            paddingHorizontal: CARD_SIDE_PADDING,
            width: carouselPageWidth,
          }}
        >
          <progressCard.ProgressCard
            card={card}
            chartTags={recordTags.data.length ? recordTags.data : card.tags}
            logColorIndex={logColorIndex}
            onPress={() => handleCardPress(card.id)}
            output={card.output}
            actionMenu={
              myRole.canManage ? (
                <cardActionsMenu.CardActionsMenu
                  className="rounded-lg"
                  isGenerating={isGenerating}
                  isTweakDisabled={!card.output}
                  onCopy={() => cardActions.openCopy(card.id)}
                  onDelete={() => cardActions.setDeletingCardId(card.id)}
                  onEdit={() => cardActions.openEditor(card.id)}
                  onRefresh={() => cardActions.handleRefresh(card.id)}
                  onTweak={() => cardActions.openTweak(card.id)}
                  showGeneratingIndicator={!!card.output}
                  onManage={
                    visibleCards.length > 1
                      ? () => cardActions.sheetManager.open('log-cards', logId)
                      : undefined
                  }
                />
              ) : isGenerating && !!card.output ? (
                <cardActionsMenu.CardGeneratingIndicator />
              ) : undefined
            }
          />
        </View>
      );
    },
    [
      cardActions,
      handleCardPress,
      logColorIndex,
      logId,
      myRole.canManage,
      recordTags.data,
      carouselPageWidth,
      cardHeight,
      visibleCards.length,
    ]
  );

  if (!visibleCards.length) return <View className="pt-4 md:pt-8" />;

  return (
    <>
      <View
        className="pt-4 md:pt-8"
        style={{
          marginLeft: carouselOuterMargin,
          marginRight: carouselOuterMargin,
          width: viewportWidth,
        }}
      >
        <View className="relative">
          <View
            className={cn(visibleCards.length > 1 && 'md:cursor-grab')}
            style={{
              alignItems: 'center',
              alignSelf: 'center',
              height: cardHeight,
              width: pageWidth,
            }}
          >
            <ReanimatedCarousel
              ref={carouselRef}
              containerStyle={{ overflow: 'visible' }}
              data={visibleCards}
              defaultIndex={activeIndexState}
              enabled={visibleCards.length > 1}
              height={cardHeight}
              loop={false}
              onProgressChange={handleCardCarouselProgressChange}
              onScrollEnd={handleCardCarouselScrollEnd}
              onScrollStart={handleCardCarouselScrollStart}
              renderItem={renderCard}
              style={{ overflow: 'visible' }}
              width={carouselPageWidth}
              windowSize={3}
            />
          </View>
        </View>
        {visibleCards.length > 1 && (
          <View
            className="flex-row mb-3 mt-3 items-center justify-between self-center"
            style={{ width: controlsWidth }}
          >
            <Button
              accessibilityLabel="Previous card"
              className="size-10 rounded-full"
              disabled={activeIndexState <= 0}
              onPress={() => setCardIndex(activeIndexState - 1)}
              size="icon-sm"
              variant="ghost"
              wrapperClassName="rounded-full"
            >
              <Icon className="text-foreground" icon={CaretLeft} />
            </Button>
            <Dots
              activeIndex={activeIndex}
              count={visibleCards.length}
              onIndexPress={setCardIndex}
              size="sm"
            />
            <Button
              accessibilityLabel="Next card"
              className="size-10 rounded-full"
              disabled={activeIndexState >= visibleCards.length - 1}
              onPress={() => setCardIndex(activeIndexState + 1)}
              size="icon-sm"
              variant="ghost"
              wrapperClassName="rounded-full"
            >
              <Icon className="text-foreground" icon={CaretRight} />
            </Button>
          </View>
        )}
        {visibleCards.length === 1 && <View className="h-4" />}
      </View>
      <DestructiveConfirmSheet
        isPending={cardActions.isDeleting}
        onConfirm={cardActions.handleDelete}
        onDismiss={() => cardActions.setDeletingCardId(undefined)}
        open={!!cardActions.deletingCardId}
        portalName="log-card-preview-delete"
        title="Delete card?"
      />
    </>
  );
};
