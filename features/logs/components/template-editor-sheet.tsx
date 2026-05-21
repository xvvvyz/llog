import { TemplateTagsPickerSheet } from '@/features/logs/components/template-tags-picker-sheet';
import { useLogColor } from '@/features/logs/hooks/use-color';
import * as limits from '@/features/logs/lib/limits';
import { createTemplate } from '@/features/logs/mutations/create-template';
import { updateTemplate } from '@/features/logs/mutations/update-template';
import { useLog } from '@/features/logs/queries/use-log';
import { useLogTemplate } from '@/features/logs/queries/use-templates';
import { MarkdownShortcutToolbar } from '@/features/records/components/markdown-shortcut-toolbar';
import { useMarkdownTextareaShortcuts } from '@/features/records/hooks/use-markdown-textarea-shortcuts';
import { AddTagsInput } from '@/features/tags/components/add-tags-input';
import { useTags } from '@/features/tags/queries/use-tags';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { blurActiveTextInput } from '@/lib/blur-active-text-input';
import { resolveSpectrumColor } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Page } from '@/ui/page';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import { CornersOut } from 'phosphor-react-native';
import * as React from 'react';
import { Platform, View } from 'react-native';
import * as textareaSelection from '@/features/records/hooks/use-textarea-selection';

export const LogTemplateEditorSheet = () => {
  const sheetManager = useSheetManager();
  const isOpen = sheetManager.isOpen('log-template-editor');
  const templateId = sheetManager.getId('log-template-editor');
  const logId = sheetManager.getContext('log-template-editor');
  const isEditingTemplate = !!templateId;
  const template = useLogTemplate({ enabled: isOpen, id: templateId });
  const log = useLog({ id: logId ?? template.log?.id ?? undefined });
  const logColor = useLogColor({ id: logId ?? template.log?.id ?? undefined });
  const [text, setText] = React.useState('');

  const inlineTextareaRef =
    React.useRef<React.ComponentRef<typeof Textarea>>(null);

  const fullscreenTextareaRef =
    React.useRef<React.ComponentRef<typeof Textarea>>(null);

  const [selectedTagIds, setSelectedTagIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const [tagsOpen, setTagsOpen] = React.useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);

  const [fullscreenInitialSelection, setFullscreenInitialSelection] =
    React.useState<textareaSelection.TextSelection | null>(null);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const resolvedLogId = logId ?? template.log?.id ?? undefined;
  const teamId = isEditingTemplate ? template.teamId : log.teamId;
  const logColorIndex = resolveSpectrumColor(log.color);

  const {
    handleSelectionChange: handleInlineSelectionChange,
    readSelection: readInlineSelection,
    setSelection: setInlineSelection,
  } = textareaSelection.useTextareaSelection({
    text,
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

  const sheetSessionKey = isEditingTemplate
    ? `edit:${templateId}`
    : `create:${logId ?? ''}`;

  const trimmedText = text.trim();

  const canSubmit =
    !!trimmedText &&
    trimmedText.length <= limits.TEMPLATE_TEXT_MAX_LENGTH &&
    (isEditingTemplate
      ? !!templateId && !!template.id
      : !!logId && !!log.teamId);

  const isLoading =
    isOpen &&
    (isEditingTemplate ? template.isLoading : !!logId && log.isLoading);

  const close = React.useCallback(() => {
    sheetManager.close('log-template-editor');
  }, [sheetManager]);

  const openTags = React.useCallback(() => {
    blurActiveTextInput();
    requestAnimationFrame(() => setTagsOpen(true));
  }, []);

  React.useEffect(() => {
    setIsSubmitting(false);

    if (!isOpen) {
      setText('');
      setInlineSelection({ end: 0, start: 0 });
      setSelectedTagIds(new Set());
      setTagsOpen(false);
      setIsFullscreenOpen(false);
      setFullscreenInitialSelection(null);
      return;
    }

    if (!isEditingTemplate) {
      setText('');
      setInlineSelection({ end: 0, start: 0 });
      setSelectedTagIds(new Set());
      setIsFullscreenOpen(false);
      setFullscreenInitialSelection(null);
      return;
    }

    if (!template.id) return;
    const templateText = template.text ?? '';
    setText(templateText);

    setInlineSelection({
      end: templateText.length,
      start: templateText.length,
    });

    setFullscreenInitialSelection(null);
    setSelectedTagIds(new Set(template.tags?.map((tag) => tag.id) ?? []));
  }, [
    isEditingTemplate,
    isOpen,
    setInlineSelection,
    sheetSessionKey,
    template.id,
    template.tags,
    template.text,
  ]);

  const handleSubmit = React.useCallback(async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      if (isEditingTemplate) {
        if (!templateId) return;

        await updateTemplate({
          id: templateId,
          tagIds: [...selectedTagIds],
          text,
        });

        close();
        return;
      }

      await createTemplate({
        logId,
        tagIds: [...selectedTagIds],
        teamId: log.teamId,
        text,
      });

      close();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    close,
    isEditingTemplate,
    log.teamId,
    logId,
    selectedTagIds,
    templateId,
    text,
  ]);

  const handleOpenFullscreen = React.useCallback(() => {
    setFullscreenInitialSelection(readInlineSelection());
    blurActiveTextInput();
    requestAnimationFrame(() => setIsFullscreenOpen(true));
  }, [readInlineSelection]);

  const fullscreenMarkdownShortcuts = useMarkdownTextareaShortcuts({
    initialSelection: fullscreenInitialSelection,
    maxLength: limits.TEMPLATE_TEXT_MAX_LENGTH,
    setText,
    text,
    textareaRef: fullscreenTextareaRef,
  });

  return (
    <>
      <Sheet
        loading={isLoading}
        onDismiss={close}
        open={isOpen}
        portalName="log-template-editor"
        topInset={64}
      >
        <View className="mx-auto max-w-lg w-full pb-4">
          <View className="p-4 pb-4 md:p-4 sm:pt-8">
            <View className="overflow-hidden border-border-secondary border-continuous rounded-xl bg-input border">
              <AddTagsInput
                disabled={!resolvedLogId || !teamId}
                onPress={openTags}
                tags={selectedTags}
              />
              <View className="border-border-secondary border-continuous border-t" />
              <View className="relative">
                <Textarea
                  ref={inlineTextareaRef}
                  autoFocus
                  className="pr-14 border-0 rounded-none bg-transparent"
                  maxLength={limits.TEMPLATE_TEXT_MAX_LENGTH}
                  maxRows={5}
                  onChangeText={setText}
                  onSelectionChange={handleInlineSelectionChange}
                  pasteRichTextAsMarkdown
                  placeholder="Today I worked on..."
                  size="sm"
                  value={text}
                />
                <View className="absolute right-1 top-1">
                  <Button
                    accessibilityLabel="Open fullscreen template"
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
              disabled={!canSubmit || isSubmitting}
              onPress={handleSubmit}
              size="sm"
              style={{ backgroundColor: logColor.default }}
              variant="secondary"
              wrapperClassName="flex-1"
            >
              {isSubmitting ? (
                <Spinner color="white" />
              ) : (
                <Text className="text-white">Save</Text>
              )}
            </Button>
          </View>
        </View>
        <TemplateTagsPickerSheet
          logColorIndex={logColorIndex}
          logId={resolvedLogId}
          onClose={() => setTagsOpen(false)}
          onSelectedTagIdsChange={setSelectedTagIds}
          open={tagsOpen}
          selectedTagIds={selectedTagIds}
          teamId={teamId}
        />
      </Sheet>
      <Sheet
        className="h-full"
        onDismiss={() => setIsFullscreenOpen(false)}
        open={isOpen && isFullscreenOpen}
        portalName="log-template-editor-fullscreen"
        width="editor"
      >
        <Page className="flex-col overflow-hidden max-h-full min-h-0 bg-popover">
          <View className="flex-1 mx-auto max-h-full max-w-4xl min-h-0 w-full">
            <View className="flex-1 min-h-0 p-4 pb-4 gap-3 md:p-4 sm:pt-8">
              <View className="relative flex-1 overflow-hidden min-h-0 border-border-secondary border-continuous rounded-2xl bg-input border">
                <Textarea
                  ref={fullscreenTextareaRef}
                  autoFocus
                  className="flex-1 min-h-full border-0 rounded-2xl bg-transparent"
                  maxLength={limits.TEMPLATE_TEXT_MAX_LENGTH}
                  onChangeText={setText}
                  onKeyDown={fullscreenMarkdownShortcuts.handleKeyDown}
                  onTouchStart={fullscreenMarkdownShortcuts.handleTouchStart}
                  pasteRichTextAsMarkdown
                  placeholder="Today I worked on..."
                  size="sm"
                  style={Platform.OS === 'web' ? { height: '100%' } : undefined}
                  value={text}
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
