import { useLogColor } from '@/features/logs/hooks/use-color';
import * as limits from '@/features/logs/lib/limits';
import { createTemplate } from '@/features/logs/mutations/create-template';
import { updateTemplate } from '@/features/logs/mutations/update-template';
import { useLog } from '@/features/logs/queries/use-log';
import { useLogTemplate } from '@/features/logs/queries/use-templates';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Sheet } from '@/ui/sheet';
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
  const log = useLog({ id: isEditingTemplate ? undefined : logId });
  const logColor = useLogColor({ id: logId ?? template.log?.id ?? undefined });
  const [name, setName] = React.useState('');
  const [text, setText] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const sheetSessionKey = isEditingTemplate
    ? `edit:${templateId}`
    : `create:${logId ?? ''}`;

  const trimmedName = name.trim();
  const trimmedText = text.trim();

  const canSubmit =
    !!trimmedName &&
    !!trimmedText &&
    trimmedName.length <= limits.TEMPLATE_NAME_MAX_LENGTH &&
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

  React.useEffect(() => {
    setIsSubmitting(false);

    if (!isOpen) {
      setName('');
      setText('');
      return;
    }

    if (!isEditingTemplate) {
      setName('');
      setText('');
      return;
    }

    if (!template.id) return;
    setName(template.name ?? '');
    setText(template.text ?? '');
  }, [
    isEditingTemplate,
    isOpen,
    sheetSessionKey,
    template.id,
    template.name,
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
          name: trimmedName,
          text: trimmedText,
        });

        close();
        return;
      }

      await createTemplate({
        logId,
        name: trimmedName,
        teamId: log.teamId,
        text: trimmedText,
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
    templateId,
    trimmedName,
    trimmedText,
  ]);

  return (
    <Sheet
      className="md:max-w-sm"
      loading={isLoading}
      onDismiss={close}
      open={isOpen}
      portalName="log-template-editor"
      topInset={64}
    >
      <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 md:p-8">
        <View>
          <Label>Name</Label>
          <Input
            autoFocus
            maxLength={limits.TEMPLATE_NAME_MAX_LENGTH}
            onChangeText={setName}
            placeholder="Daily update"
            returnKeyType="next"
            value={name}
          />
        </View>
        <View className="mt-4">
          <Label>Content</Label>
          <Textarea
            maxLength={limits.TEMPLATE_TEXT_MAX_LENGTH}
            maxRows={3}
            minRows={3}
            onChangeText={setText}
            placeholder="Today I worked on…"
            value={text}
          />
        </View>
        <View className="flex-row mt-8 gap-4">
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
            <Text className="text-white">
              {isSubmitting ? 'Saving…' : 'Save'}
            </Text>
          </Button>
        </View>
      </View>
    </Sheet>
  );
};
