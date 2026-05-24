import { CardActionsMenu } from '@/features/cards/components/card-actions-menu';
import * as cardMutations from '@/features/cards/mutations/cards';
import { useLogCards } from '@/features/cards/queries/use-cards';
import type { LogCard } from '@/features/cards/types/card';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { TemplateTagSummary } from '@/features/logs/components/template-tag-summary';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';
import { nativePointerEvents } from '@/ui/pointer-events';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import * as Sortable from '@/ui/sortable';
import { SortableSheetDragHandle } from '@/ui/sortable';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

const CardRow = ({
  card,
  isGenerating,
  isTweakDisabled,
  onCopy,
  onDelete,
  onEdit,
  onRefresh,
  onTweak,
}: {
  card: LogCard;
  isGenerating: boolean;
  isTweakDisabled?: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onRefresh: () => Promise<unknown> | void;
  onTweak?: () => void;
}) => (
  <View className="relative h-10 w-full">
    <Button
      className="h-10 w-full"
      onPress={onEdit}
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
        <TemplateTagSummary tags={card.tags} />
        <Text
          className="flex-1 min-w-0 font-normal text-muted-foreground text-sm"
          numberOfLines={1}
        >
          {card.title}
        </Text>
      </View>
      <CardActionsMenu
        buttonSize="icon-xs"
        className="border-continuous rounded-lg"
        generatingIndicator="inline"
        iconSize={18}
        isGenerating={isGenerating}
        isTweakDisabled={isTweakDisabled}
        onCopy={onCopy}
        onDelete={onDelete}
        onEdit={onEdit}
        onRefresh={onRefresh}
        onTweak={onTweak}
        containerClassName={cn(
          'mr-1 web:pointer-events-auto',
          isGenerating ? 'ml-3' : 'ml-2'
        )}
      />
    </View>
  </View>
);

export const LogCardsSheet = () => {
  const sheetManager = useSheetManager();
  const logId = sheetManager.getId('log-cards');
  const isOpen = sheetManager.isOpen('log-cards');
  const cards = useLogCards({ enabled: isOpen, logId });
  const logColor = useLogColor({ id: logId });
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const [deletingCardId, setDeletingCardId] = React.useState<string>();

  const { isSubmitting: isDeleting, runSubmit: runDelete } =
    useSheetSubmitState({ isOpen: !!deletingCardId });

  React.useEffect(() => {
    if (!isOpen) setDeletingCardId(undefined);
  }, [isOpen]);

  const openEditor = React.useCallback(
    (cardId?: string) => {
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

  const handleDragEnd = React.useCallback(
    async (params: Sortable.SortableGridDragEndParams<LogCard>) => {
      try {
        await cardMutations.reorderCards({
          logId,
          orderedIds: params.data.map((card) => card.id),
        });
      } catch {
        // noop
      }
    },
    [logId]
  );

  const handleDelete = React.useCallback(async () => {
    if (!deletingCardId) return;

    await runDelete(async ({ keepPendingUntilClose }) => {
      await cardMutations.deleteCard(deletingCardId);
      setDeletingCardId(undefined);
      keepPendingUntilClose();
    });
  }, [deletingCardId, runDelete]);

  const handleRefresh = React.useCallback(
    (cardId: string) => cardMutations.refreshCard(cardId),
    []
  );

  return (
    <>
      <Sheet
        onDismiss={() => sheetManager.close('log-cards')}
        open={isOpen}
        portalName="log-cards"
        variant="list"
      >
        <SheetListScrollView
          ref={scrollViewRef}
          loading={cards.isLoading}
          variant="rows"
        >
          {cards.data.length > 0 ? (
            <Sortable.SortableGrid
              autoScrollDirection="vertical"
              columns={1}
              data={cards.data}
              onDragEnd={handleDragEnd}
              rowGap={8}
              scrollableRef={scrollViewRef}
              renderItem={({ item: card }) => (
                <CardRow
                  card={card}
                  isGenerating={!!card.isGenerating}
                  isTweakDisabled={!card.output}
                  onCopy={() => openCopy(card.id)}
                  onDelete={() => setDeletingCardId(card.id)}
                  onEdit={() => openEditor(card.id)}
                  onRefresh={() => handleRefresh(card.id)}
                  onTweak={() => openTweak(card.id)}
                />
              )}
            />
          ) : (
            <Text className="mx-auto max-w-56 text-center text-muted-foreground md:py-6">
              Create progress cards from tagged records.
            </Text>
          )}
        </SheetListScrollView>
        <SheetFooter contentClassName="flex-row gap-4">
          <Button
            onPress={() => sheetManager.close('log-cards')}
            size="sm"
            variant="secondary"
            wrapperClassName="flex-1"
          >
            <Text>Close</Text>
          </Button>
          <Button
            className="active:opacity-90 web:hover:opacity-90"
            disabled={!logId}
            onPress={() => openEditor()}
            size="sm"
            style={{ backgroundColor: logColor.default }}
            variant="secondary"
            wrapperClassName="flex-1"
          >
            <Text className="text-white">New</Text>
          </Button>
        </SheetFooter>
      </Sheet>
      <DestructiveConfirmSheet
        isPending={isDeleting}
        onConfirm={handleDelete}
        onDismiss={() => setDeletingCardId(undefined)}
        open={!!deletingCardId}
        portalName="log-card-delete"
        title="Delete card?"
      />
    </>
  );
};
