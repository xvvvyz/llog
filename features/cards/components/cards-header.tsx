import { Dots } from '@/features/files/components/carousel/dots';
import { ProgressCard } from '@/features/cards/components/progress-card';
import * as cardMutations from '@/features/cards/mutations/cards';
import type { LogCard } from '@/features/cards/types/card';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
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

import ReanimatedCarousel, {
  type ICarouselInstance,
} from 'react-native-reanimated-carousel';

const LIST_MAX_WIDTH = 512;
const LIST_SIDE_PADDING = 16;
const CARD_GAP = 16;
const CARD_SIDE_PADDING = CARD_GAP / 2;
const CARD_HEIGHT = 208;
const CARD_ARROW_SIZE = 40;
const CARD_CONTROL_EDGE_INSET = 6;

const useCardPreviewActions = ({ logId }: { logId?: string }) => {
  const sheetManager = useSheetManager();
  const [deletingCardId, setDeletingCardId] = React.useState<string>();
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    setDeletingCardId(undefined);
    setIsDeleting(false);
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
    setIsDeleting(true);

    try {
      await cardMutations.deleteCard(deletingCardId);
      setDeletingCardId(undefined);
    } catch {
      // noop
    } finally {
      setIsDeleting(false);
    }
  }, [deletingCardId]);

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
  const carouselScrollStartIndexRef = React.useRef<number | null>(null);
  const didCarouselMoveRef = React.useRef(false);
  const suppressCardPressRef = React.useRef(false);

  const suppressCardPressTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const activeIndex = useSharedValue(0);
  const [activeIndexState, setActiveIndexState] = React.useState(0);
  const visibleCards = cards.filter((card) => card.type === 'progress');

  const myRole = useMyRole({
    teamId: visibleCards[0]?.teamId ?? teamId ?? null,
  });

  const cardActions = useCardPreviewActions({ logId });
  const logColorIndex = resolveSpectrumColor(logColor);
  const viewportWidth = Math.max(1, windowDimensions.width);
  const pageWidth = Math.max(1, Math.min(viewportWidth, LIST_MAX_WIDTH));
  const carouselPageWidth = Math.max(1, pageWidth - LIST_SIDE_PADDING);
  const sideOverflow = Math.max(0, (viewportWidth - pageWidth) / 2);
  const carouselOuterMargin = -(sideOverflow + LIST_SIDE_PADDING);
  const previousCarouselPageWidthRef = React.useRef(carouselPageWidth);
  const previousVisibleCardCountRef = React.useRef(visibleCards.length);

  const controlsWidth = Math.max(
    CARD_ARROW_SIZE * 2,
    pageWidth - LIST_SIDE_PADDING * 2 - CARD_CONTROL_EDGE_INSET * 2
  );

  const setCardIndex = React.useCallback(
    (index: number, animated = true) => {
      const nextIndex = clampIndex(index, visibleCards.length);
      activeIndex.value = nextIndex;
      activeIndexRef.current = nextIndex;
      setActiveIndexState(nextIndex);
      carouselRef.current?.scrollTo({ animated, index: nextIndex });
    },
    [activeIndex, visibleCards.length]
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

      if (nextIndex === activeIndexRef.current) return;
      activeIndexRef.current = nextIndex;
      setActiveIndexState(nextIndex);
    },
    [activeIndex, visibleCards.length]
  );

  const handleCardCarouselScrollStart = React.useCallback(() => {
    carouselScrollStartIndexRef.current = activeIndexRef.current;
    didCarouselMoveRef.current = false;
  }, []);

  const handleCardCarouselScrollEnd = React.useCallback(
    (index: number) => {
      const nextIndex = clampIndex(index, visibleCards.length);
      activeIndex.value = nextIndex;
      activeIndexRef.current = nextIndex;
      setActiveIndexState(nextIndex);
      if (didCarouselMoveRef.current) markNextCardPressSuppressed();
      carouselScrollStartIndexRef.current = null;
      didCarouselMoveRef.current = false;
    },
    [activeIndex, markNextCardPressSuppressed, visibleCards.length]
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
      activeIndex.value = 0;
      activeIndexRef.current = 0;
      setActiveIndexState(0);
      return;
    }

    const nextIndex = clampIndex(activeIndexRef.current, visibleCards.length);
    const didShrink = visibleCards.length < previousCount;
    if (!didShrink && nextIndex === activeIndexState) return;
    setCardIndex(nextIndex, false);
  }, [activeIndex, activeIndexState, setCardIndex, visibleCards.length]);

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
            height: CARD_HEIGHT,
            paddingHorizontal: CARD_SIDE_PADDING,
            width: carouselPageWidth,
          }}
        >
          <ProgressCard
            card={card}
            className="h-52"
            logColorIndex={logColorIndex}
            onPress={() => handleCardPress(card.id)}
            output={card.output}
            actionMenu={
              myRole.canManage ? (
                <cardActionsMenu.CardActionsMenu
                  className="rounded-lg"
                  containerClassName="-mr-1.5 -mt-1.5"
                  isGenerating={isGenerating}
                  onCopy={() => cardActions.openCopy(card.id)}
                  onDelete={() => cardActions.setDeletingCardId(card.id)}
                  onEdit={() => cardActions.openEditor(card.id)}
                  onRefresh={() => cardActions.handleRefresh(card.id)}
                  showGeneratingIndicator={!!card.output}
                  onManage={
                    visibleCards.length > 1
                      ? () => cardActions.sheetManager.open('log-cards', logId)
                      : undefined
                  }
                  onTweak={
                    card.output
                      ? () => cardActions.openTweak(card.id)
                      : undefined
                  }
                />
              ) : isGenerating && !!card.output ? (
                <cardActionsMenu.CardGeneratingIndicator className="-mr-1.5 -mt-1.5" />
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
      carouselPageWidth,
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
              height: CARD_HEIGHT,
              width: pageWidth,
            }}
          >
            <ReanimatedCarousel
              ref={carouselRef}
              containerStyle={{ overflow: 'visible' }}
              data={visibleCards}
              enabled={visibleCards.length > 1}
              height={CARD_HEIGHT}
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
