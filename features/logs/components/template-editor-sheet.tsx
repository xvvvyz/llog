import { TemplateTagsPickerSheet } from '@/features/logs/components/template-tags-picker-sheet';
import { useLogColor } from '@/features/logs/hooks/use-color';
import * as limits from '@/features/logs/lib/limits';
import { createTemplate } from '@/features/logs/mutations/create-template';
import { updateTemplate } from '@/features/logs/mutations/update-template';
import { useLog } from '@/features/logs/queries/use-log';
import { useLogTemplate } from '@/features/logs/queries/use-templates';
import { AddTagsInput } from '@/features/tags/components/add-tags-input';
import { useTags } from '@/features/tags/queries/use-tags';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { blurActiveTextInput } from '@/lib/blur-active-text-input';
import { resolveSpectrumColor } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import * as React from 'react';
import { View } from 'react-native';

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

  const [selectedTagIds, setSelectedTagIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const [tagsOpen, setTagsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const resolvedLogId = logId ?? template.log?.id ?? undefined;
  const teamId = isEditingTemplate ? template.teamId : log.teamId;
  const logColorIndex = resolveSpectrumColor(log.color);

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
      setSelectedTagIds(new Set());
      setTagsOpen(false);
      return;
    }

    if (!isEditingTemplate) {
      setText('');
      setSelectedTagIds(new Set());
      return;
    }

    if (!template.id) return;
    setText(template.text ?? '');
    setSelectedTagIds(new Set(template.tags?.map((tag) => tag.id) ?? []));
  }, [
    isEditingTemplate,
    isOpen,
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

  return (
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
            <Textarea
              autoFocus
              className="border-0 rounded-none bg-transparent"
              maxLength={limits.TEMPLATE_TEXT_MAX_LENGTH}
              maxRows={5}
              onChangeText={setText}
              placeholder="Today I worked on..."
              size="sm"
              value={text}
            />
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
  );
};
