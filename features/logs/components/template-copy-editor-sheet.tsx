import * as limits from '@/features/logs/lib/limits';
import { copyTemplate } from '@/features/logs/mutations/copy-template';
import { useLogTemplate } from '@/features/logs/queries/use-templates';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { alert } from '@/lib/alert';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import * as React from 'react';
import { View } from 'react-native';

export const LogTemplateCopyEditorSheet = () => {
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('log-template-copy-editor');
  const templateId = sheetManager.getId('log-template-copy-editor');
  const payload = sheetManager.getPayload('log-template-copy-editor') ?? {};
  const template = useLogTemplate({ enabled: open, id: templateId });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [text, setText] = React.useState('');
  const targetCount = payload.logIds?.length ?? 0;
  const trimmedText = text.trim();

  const canSubmit =
    !!templateId &&
    targetCount > 0 &&
    !!trimmedText &&
    trimmedText.length <= limits.TEMPLATE_TEXT_MAX_LENGTH;

  const close = React.useCallback(() => {
    sheetManager.close('log-template-copy-editor');
  }, [sheetManager]);

  React.useEffect(() => {
    setIsSubmitting(false);

    if (!open) {
      setText('');
      return;
    }

    if (!template.id) return;
    setText(template.text ?? '');
  }, [open, template.id, template.text]);

  const handleSubmit = React.useCallback(async () => {
    if (!canSubmit || !templateId || !payload.logIds?.length) return;
    setIsSubmitting(true);

    try {
      await copyTemplate({
        createMissingTags: !!payload.createMissingTags,
        logIds: payload.logIds,
        templateId,
        text,
      });

      sheetManager.close('log-template-copy-to');
    } catch (error) {
      setIsSubmitting(false);

      alert({
        message:
          error instanceof Error ? error.message : 'Failed to copy template',
        title: 'Error',
      });
    }
  }, [
    canSubmit,
    payload.createMissingTags,
    payload.logIds,
    sheetManager,
    templateId,
    text,
  ]);

  return (
    <Sheet
      loading={open && template.isLoading}
      onDismiss={close}
      open={open}
      portalName="log-template-copy-editor"
      topInset={64}
    >
      <View className="mx-auto max-w-lg w-full pb-4">
        <View className="p-4 pb-4 md:p-4 sm:pt-8">
          <View className="overflow-hidden border-border-secondary border-continuous rounded-xl bg-input border">
            <Textarea
              autoFocus
              className="border-0 rounded-none bg-transparent"
              maxLength={limits.TEMPLATE_TEXT_MAX_LENGTH}
              maxRows={8}
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
            <Text>Back</Text>
          </Button>
          <Button
            disabled={!canSubmit || isSubmitting}
            onPress={handleSubmit}
            size="sm"
            wrapperClassName="flex-1"
          >
            {isSubmitting ? <Spinner /> : <Text>Copy</Text>}
          </Button>
        </View>
      </View>
    </Sheet>
  );
};
