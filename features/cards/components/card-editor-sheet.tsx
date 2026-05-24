import { CardTagsPickerSheet } from '@/features/cards/components/card-tags-picker-sheet';
import * as cardMutations from '@/features/cards/mutations/cards';
import { useLogCard } from '@/features/cards/queries/use-cards';
import { useHasCardSourceRecords } from '@/features/cards/queries/use-has-card-source-records';
import type { CardCreatePayload } from '@/features/cards/types/card';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { useLog } from '@/features/logs/queries/use-log';
import { CARD_PROMPT_MAX_LENGTH } from '@/domain/cards/constants';
import { AddTagsInput } from '@/features/tags/components/add-tags-input';
import { useTags } from '@/features/tags/queries/use-tags';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { blurActiveTextInput } from '@/lib/blur-active-text-input';
import { cn } from '@/lib/cn';
import { resolveSpectrumColor } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import { Sparkle } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import * as textareaSelection from '@/features/records/hooks/use-textarea-selection';

export const LogCardEditorSheet = () => {
  const sheetManager = useSheetManager();
  const isOpen = sheetManager.isOpen('log-card-editor');
  const cardId = sheetManager.getId('log-card-editor');
  const logId = sheetManager.getContext('log-card-editor');
  const isEditing = !!cardId;
  const card = useLogCard({ enabled: isOpen && isEditing, id: cardId });
  const log = useLog({ id: logId ?? card.logId ?? undefined });
  const logColor = useLogColor({ id: logId ?? card.logId ?? undefined });
  const [prompt, setPrompt] = React.useState('');

  const inlineTextareaRef =
    React.useRef<React.ComponentRef<typeof Textarea>>(null);

  const [selectedTagIds, setSelectedTagIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const [tagsOpen, setTagsOpen] = React.useState(false);
  const [isSuggestingPrompt, setIsSuggestingPrompt] = React.useState(false);
  const { isSubmitting, runSubmit } = useSheetSubmitState({ isOpen });
  const resolvedLogId = logId ?? card.logId ?? undefined;
  const teamId = isEditing ? card.teamId : log.teamId;
  const logColorIndex = resolveSpectrumColor(log.color);

  const {
    handleSelectionChange: handleInlineSelectionChange,
    setSelection: setInlineSelection,
  } = textareaSelection.useTextareaSelection({
    text: prompt,
    textareaRef: inlineTextareaRef,
  });

  const tags = useTags({
    enabled: isOpen,
    logId: resolvedLogId,
    teamIds: teamId ? [teamId] : [],
    type: 'record',
  });

  const selectedTags = React.useMemo(
    () => tags.data.filter((tag) => selectedTagIds.has(tag.id)),
    [selectedTagIds, tags.data]
  );

  const sourceRecords = useHasCardSourceRecords({
    enabled: isOpen,
    logId: resolvedLogId,
    tagIds: selectedTagIds,
  });

  const isLoading = isOpen && (isEditing ? card.isLoading : log.isLoading);

  const canSubmit =
    !!resolvedLogId &&
    !!teamId &&
    !!prompt.trim() &&
    selectedTagIds.size > 0 &&
    !isSubmitting &&
    !isSuggestingPrompt;

  const showPromptInput = selectedTagIds.size > 0;
  const showSuggestPrompt = showPromptInput && !prompt.trim();

  const canSuggestPrompt =
    showSuggestPrompt &&
    !!resolvedLogId &&
    selectedTagIds.size > 0 &&
    sourceRecords.hasSourceRecords &&
    !sourceRecords.isLoading &&
    !isSuggestingPrompt &&
    !isSubmitting;

  const showSuggestPromptButton =
    canSuggestPrompt || (showSuggestPrompt && isSuggestingPrompt);

  const close = React.useCallback(() => {
    sheetManager.close('log-card-editor');
  }, [sheetManager]);

  const handleDismiss = React.useCallback(() => {
    if (isSubmitting) return;
    close();
  }, [close, isSubmitting]);

  const openTags = React.useCallback(() => {
    if (isSuggestingPrompt) return;
    blurActiveTextInput();
    requestAnimationFrame(() => setTagsOpen(true));
  }, [isSuggestingPrompt]);

  React.useEffect(() => {
    if (!isOpen) {
      setIsSuggestingPrompt(false);
      setPrompt('');
      setInlineSelection({ end: 0, start: 0 });
      setSelectedTagIds(new Set());
      setTagsOpen(false);
    }
  }, [isOpen, setInlineSelection]);

  React.useEffect(() => {
    if (!isOpen) return;

    if (!isEditing) {
      setPrompt('');
      setInlineSelection({ end: 0, start: 0 });
      setSelectedTagIds(new Set());
      return;
    }

    if (!card.id) return;
    const cardPrompt = card.prompt ?? '';
    setPrompt(cardPrompt);
    setInlineSelection({ end: cardPrompt.length, start: cardPrompt.length });
    setSelectedTagIds(new Set(card.tags?.map((tag) => tag.id) ?? []));
  }, [card.id, card.prompt, card.tags, isEditing, isOpen, setInlineSelection]);

  const buildPayload = React.useCallback((): CardCreatePayload | null => {
    if (!resolvedLogId) return null;
    return { logId: resolvedLogId, prompt, tagIds: [...selectedTagIds] };
  }, [prompt, resolvedLogId, selectedTagIds]);

  const handleSelectedTagIdsChange = React.useCallback<
    React.Dispatch<React.SetStateAction<Set<string>>>
  >((value) => {
    setSelectedTagIds((current) =>
      typeof value === 'function' ? value(current) : value
    );
  }, []);

  const handleSuggestPrompt = React.useCallback(async () => {
    if (
      !resolvedLogId ||
      !selectedTagIds.size ||
      !sourceRecords.hasSourceRecords ||
      sourceRecords.isLoading ||
      isSuggestingPrompt ||
      isSubmitting ||
      !showSuggestPrompt
    ) {
      return;
    }

    setIsSuggestingPrompt(true);

    try {
      const response = await cardMutations.suggestCardPrompt({
        ...(cardId && { cardId }),
        logId: resolvedLogId,
        tagIds: [...selectedTagIds],
      });

      setPrompt(response.prompt);
    } catch {
      // noop
    } finally {
      setIsSuggestingPrompt(false);
    }
  }, [
    cardId,
    isSubmitting,
    isSuggestingPrompt,
    resolvedLogId,
    selectedTagIds,
    showSuggestPrompt,
    sourceRecords.hasSourceRecords,
    sourceRecords.isLoading,
  ]);

  const handleSubmit = React.useCallback(async () => {
    if (!canSubmit) return;
    const payload = buildPayload();
    if (!payload) return;
    if (isEditing && !cardId) return;

    await runSubmit(
      async ({ keepPendingUntilClose }) => {
        const result = isEditing
          ? await cardMutations.updateCard({
              id: cardId,
              prompt: payload.prompt,
              tagIds: payload.tagIds,
            })
          : await cardMutations.createCard(payload);

        if (result.success && result.queued) {
          close();
          keepPendingUntilClose();
        }
      },
      { suppressError: true }
    );
  }, [buildPayload, canSubmit, cardId, close, isEditing, runSubmit]);

  return (
    <>
      <Sheet
        loading={isLoading}
        onDismiss={handleDismiss}
        open={isOpen}
        portalName="log-card-editor"
        topInset={64}
      >
        <View className="mx-auto max-w-lg w-full pb-4">
          <View className="p-4 pb-4 md:p-4 sm:pt-8">
            <View className="overflow-hidden border-border-secondary border-continuous rounded-xl bg-input border">
              <AddTagsInput
                disabled={!resolvedLogId || !teamId || isSuggestingPrompt}
                onPress={openTags}
                placeholder="Select source tags…"
                tags={selectedTags}
              />
              {showPromptInput && (
                <>
                  <View className="border-border-secondary border-continuous border-t" />
                  <View className="relative">
                    <Textarea
                      ref={inlineTextareaRef}
                      maxLength={CARD_PROMPT_MAX_LENGTH}
                      maxRows={6}
                      minRows={3}
                      onChangeText={setPrompt}
                      onSelectionChange={handleInlineSelectionChange}
                      placeholder="What are we tracking?"
                      readOnly={isSuggestingPrompt}
                      size="sm"
                      value={prompt}
                      className={cn(
                        'border-0 rounded-none bg-transparent',
                        showSuggestPromptButton && 'pr-32'
                      )}
                    />
                    {showSuggestPromptButton && (
                      <View className="absolute right-1 top-1">
                        <Button
                          accessibilityLabel="Suggest card prompt"
                          className="rounded-lg"
                          disabled={isSuggestingPrompt}
                          onPress={handleSuggestPrompt}
                          size="xs"
                          variant="ghost"
                          wrapperClassName="rounded-lg border-continuous"
                        >
                          {isSuggestingPrompt ? (
                            <Spinner
                              className="text-muted-foreground"
                              size="xs"
                            />
                          ) : (
                            <Icon
                              color={logColor.default}
                              icon={Sparkle}
                              size={18}
                              weight="fill"
                            />
                          )}
                          <Text className="mt-px">Suggest</Text>
                        </Button>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
          <View className="flex-row mx-8 gap-4 md:mx-8">
            <Button
              disabled={isSubmitting}
              onPress={close}
              size="sm"
              variant="secondary"
              wrapperClassName="flex-1"
            >
              <Text>Cancel</Text>
            </Button>
            <Button
              className="active:opacity-90 web:hover:opacity-90"
              disabled={!canSubmit}
              onPress={handleSubmit}
              size="sm"
              style={{ backgroundColor: logColor.default }}
              variant="secondary"
              wrapperClassName="flex-1"
            >
              {isSubmitting ? (
                <Spinner color="white" />
              ) : (
                <Text className="text-white">Generate</Text>
              )}
            </Button>
          </View>
        </View>
        <CardTagsPickerSheet
          logColorIndex={logColorIndex}
          logId={resolvedLogId}
          onClose={() => setTagsOpen(false)}
          onSelectedTagIdsChange={handleSelectedTagIdsChange}
          open={tagsOpen}
          selectedTagIds={selectedTagIds}
          teamId={teamId}
        />
      </Sheet>
    </>
  );
};
