import { CardTagsPickerSheet } from '@/features/cards/components/card-tags-picker-sheet';
import * as cardMutations from '@/features/cards/mutations/cards';
import { useLogCard } from '@/features/cards/queries/use-cards';
import { useHasCardSourceRecords } from '@/features/cards/queries/use-has-card-source-records';
import type { CardCreatePayload } from '@/features/cards/types/card';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { useLog } from '@/features/logs/queries/use-log';
import { CARD_PROMPT_MAX_LENGTH } from '@/domain/cards/constants';
import { MarkdownShortcutToolbar } from '@/features/records/components/markdown-shortcut-toolbar';
import { useMarkdownTextareaShortcuts } from '@/features/records/hooks/use-markdown-textarea-shortcuts';
import { AddTagsInput } from '@/features/tags/components/add-tags-input';
import { useTags } from '@/features/tags/queries/use-tags';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { blurActiveTextInput } from '@/lib/blur-active-text-input';
import { cn } from '@/lib/cn';
import { resolveSpectrumColor } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Page } from '@/ui/page';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import { CornersOut, Sparkle } from 'phosphor-react-native';
import * as React from 'react';
import { Platform, View } from 'react-native';
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

  const fullscreenTextareaRef =
    React.useRef<React.ComponentRef<typeof Textarea>>(null);

  const [selectedTagIds, setSelectedTagIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const [isPromptFocused, setIsPromptFocused] = React.useState(false);
  const [tagsOpen, setTagsOpen] = React.useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);

  const [fullscreenInitialSelection, setFullscreenInitialSelection] =
    React.useState<textareaSelection.TextSelection | null>(null);

  const [isSuggestingPrompt, setIsSuggestingPrompt] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const resolvedLogId = logId ?? card.logId ?? undefined;
  const teamId = isEditing ? card.teamId : log.teamId;
  const logColorIndex = resolveSpectrumColor(log.color);

  const {
    handleSelectionChange: handleInlineSelectionChange,
    readSelection: readInlineSelection,
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
    enabled: isOpen && !prompt.trim(),
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

  const showPromptSuggestion =
    !!resolvedLogId &&
    selectedTagIds.size > 0 &&
    sourceRecords.hasSourceRecords &&
    !sourceRecords.isLoading &&
    !prompt.trim() &&
    !isPromptFocused;

  const close = React.useCallback(() => {
    sheetManager.close('log-card-editor');
  }, [sheetManager]);

  const handleDismiss = React.useCallback(() => {
    if (isSubmitting) return;
    close();
  }, [close, isSubmitting]);

  const openTags = React.useCallback(() => {
    blurActiveTextInput();
    requestAnimationFrame(() => setTagsOpen(true));
  }, []);

  React.useEffect(() => {
    setIsSubmitting(false);
    setIsSuggestingPrompt(false);

    if (!isOpen) {
      setPrompt('');
      setInlineSelection({ end: 0, start: 0 });
      setSelectedTagIds(new Set());
      setIsPromptFocused(false);
      setTagsOpen(false);
      setIsFullscreenOpen(false);
      setFullscreenInitialSelection(null);
      return;
    }

    if (!isEditing) {
      setPrompt('');
      setInlineSelection({ end: 0, start: 0 });
      setSelectedTagIds(new Set());
      setIsPromptFocused(false);
      setIsFullscreenOpen(false);
      setFullscreenInitialSelection(null);
      return;
    }

    if (!card.id) return;
    const cardPrompt = card.prompt ?? '';
    setPrompt(cardPrompt);
    setInlineSelection({ end: cardPrompt.length, start: cardPrompt.length });
    setFullscreenInitialSelection(null);
    setSelectedTagIds(new Set(card.tags?.map((tag) => tag.id) ?? []));
    setIsPromptFocused(false);
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
      prompt.trim()
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
    prompt,
    resolvedLogId,
    selectedTagIds,
    sourceRecords.hasSourceRecords,
    sourceRecords.isLoading,
  ]);

  const handleOpenFullscreen = React.useCallback(() => {
    setFullscreenInitialSelection(readInlineSelection());
    blurActiveTextInput();
    requestAnimationFrame(() => setIsFullscreenOpen(true));
  }, [readInlineSelection]);

  const fullscreenMarkdownShortcuts = useMarkdownTextareaShortcuts({
    initialSelection: fullscreenInitialSelection,
    maxLength: CARD_PROMPT_MAX_LENGTH,
    setText: setPrompt,
    text: prompt,
    textareaRef: fullscreenTextareaRef,
  });

  const handleSubmit = React.useCallback(async () => {
    if (!canSubmit) return;
    const payload = buildPayload();
    if (!payload) return;
    if (isEditing && !cardId) return;
    setIsSubmitting(true);

    try {
      const result = isEditing
        ? await cardMutations.updateCard({
            id: cardId,
            prompt: payload.prompt,
            tagIds: payload.tagIds,
          })
        : await cardMutations.createCard(payload);

      if (result.success && result.queued) close();
    } catch {
      // noop
    } finally {
      setIsSubmitting(false);
    }
  }, [buildPayload, canSubmit, cardId, close, isEditing]);

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
                disabled={!resolvedLogId || !teamId}
                onPress={openTags}
                placeholder="Source tags"
                tags={selectedTags}
              />
              <View className="border-border-secondary border-continuous border-t" />
              <View className="relative">
                <Textarea
                  ref={inlineTextareaRef}
                  maxLength={CARD_PROMPT_MAX_LENGTH}
                  maxRows={6}
                  minRows={3}
                  onBlur={() => setIsPromptFocused(false)}
                  onChangeText={setPrompt}
                  onFocus={() => setIsPromptFocused(true)}
                  onSelectionChange={handleInlineSelectionChange}
                  placeholder="Track progress, trends, milestones..."
                  size="sm"
                  value={prompt}
                  className={cn(
                    'border-0 rounded-none bg-transparent',
                    showPromptSuggestion ? 'pr-24' : 'pr-14'
                  )}
                />
                <View className="absolute right-1 top-1 flex-row gap-1">
                  {showPromptSuggestion && (
                    <Button
                      className="h-8 w-8 rounded-lg"
                      disabled={isSuggestingPrompt}
                      onPress={handleSuggestPrompt}
                      size="icon"
                      variant="ghost"
                      wrapperClassName="rounded-lg border-continuous"
                    >
                      {isSuggestingPrompt ? (
                        <Spinner className="text-muted-foreground" size="xs" />
                      ) : (
                        <Icon
                          className="text-muted-foreground"
                          icon={Sparkle}
                          size={20}
                        />
                      )}
                    </Button>
                  )}
                  <Button
                    accessibilityLabel="Open fullscreen card prompt"
                    className="h-8 w-8 rounded-lg"
                    disabled={isSubmitting}
                    onPress={handleOpenFullscreen}
                    size="icon"
                    variant="ghost"
                    wrapperClassName="rounded-lg border-continuous"
                  >
                    <Icon
                      className="text-muted-foreground"
                      icon={CornersOut}
                      size={20}
                    />
                  </Button>
                </View>
              </View>
            </View>
          </View>
          <View className="flex-row mx-8 gap-4 md:mx-8">
            <Button
              disabled={isSubmitting || isSuggestingPrompt}
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
      <Sheet
        className="h-full"
        onDismiss={() => setIsFullscreenOpen(false)}
        open={isOpen && isFullscreenOpen}
        portalName="log-card-editor-fullscreen"
      >
        <Page className="flex-col overflow-hidden max-h-full min-h-0 bg-popover">
          <View className="flex-1 mx-auto max-h-full max-w-lg min-h-0 w-full">
            <View className="flex-1 min-h-0 p-4 pb-4 gap-3 md:p-4 sm:pt-8">
              <View className="relative flex-1 overflow-hidden min-h-0 border-border-secondary border-continuous rounded-2xl bg-input border">
                <Textarea
                  ref={fullscreenTextareaRef}
                  autoFocus
                  className="flex-1 min-h-full border-0 rounded-2xl bg-transparent"
                  maxLength={CARD_PROMPT_MAX_LENGTH}
                  onBlur={() => setIsPromptFocused(false)}
                  onChangeText={setPrompt}
                  onFocus={() => setIsPromptFocused(true)}
                  onKeyDown={fullscreenMarkdownShortcuts.handleKeyDown}
                  onTouchStart={fullscreenMarkdownShortcuts.handleTouchStart}
                  placeholder="Track progress, trends, milestones..."
                  size="sm"
                  style={Platform.OS === 'web' ? { height: '100%' } : undefined}
                  value={prompt}
                  onSelectionChange={
                    fullscreenMarkdownShortcuts.handleSelectionChange
                  }
                />
              </View>
              <View className="flex-row px-4 gap-3 items-center shrink-0">
                <View className="flex-1 flex-row gap-2 items-center">
                  <MarkdownShortcutToolbar
                    onShortcut={fullscreenMarkdownShortcuts.handleShortcut}
                    onShortcutPressStart={
                      fullscreenMarkdownShortcuts.handleShortcutPressStart
                    }
                  />
                </View>
                <Button
                  onPress={() => setIsFullscreenOpen(false)}
                  size="xs"
                  variant="secondary"
                >
                  <Text>Done</Text>
                </Button>
              </View>
            </View>
          </View>
        </Page>
      </Sheet>
    </>
  );
};
