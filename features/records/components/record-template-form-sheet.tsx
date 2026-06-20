import * as pickedFiles from '@/features/files/lib/picked';
import { formatFileSize } from '@/features/files/lib/file-size';
import type { LogTemplate } from '@/features/logs/types/template';
import { AudioSheetContent } from '@/features/records/components/audio-sheet-content';
import { renderRecordMarkdownText } from '@/features/records/components/record-markdown-text';
import { useAudioRecorder } from '@/features/records/hooks/use-audio-recorder';
import type { RecordTemplateAttachment } from '@/features/records/lib/record-template-attachments';
import * as linkUrl from '@/features/records/lib/link-url';
import { cn } from '@/lib/cn';
import { durationMsToSeconds, durationSecondsToMs } from '@/lib/duration';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import { Field } from '@/ui/field';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { NumberInput } from '@/ui/number-input';
import { Sheet } from '@/ui/sheet';
import { SheetFormScrollView } from '@/ui/sheet-form-scroll-view';
import { SheetFooter } from '@/ui/sheet-list';
import { Spinner } from '@/ui/spinner';
import { Text, TextContext } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import { getDocumentAsync } from 'expo-document-picker';
import * as React from 'react';
import { View } from 'react-native';
import * as structuredTemplate from '@/features/logs/lib/structured-template';

import {
  Check,
  Link as LinkIcon,
  Microphone,
  UploadSimple,
} from 'phosphor-react-native';

type TemplateAttachmentByFieldId = Record<
  string,
  RecordTemplateAttachment | undefined
>;

type TemplateFormItem =
  | { key: string; text: string; type: 'text' }
  | { key: string; text: string; type: 'hidden' }
  | {
      field: structuredTemplate.StructuredTemplateField;
      helperText?: string;
      key: string;
      label?: string;
      placeholder?: string;
      repeated: boolean;
      type: 'field';
    };

type RecordTemplateFormSheetProps = {
  checkboxCheckedClassName?: string;
  continueButtonClassName?: string;
  continueButtonInteractiveClassName?: string;
  onApply: (input: {
    attachments: RecordTemplateAttachment[];
    template: LogTemplate;
    text: string;
  }) => Promise<void>;
  onClose: () => void;
  open: boolean;
  template?: LogTemplate | null;
};

export const RecordTemplateFormSheet = ({
  checkboxCheckedClassName,
  continueButtonClassName,
  continueButtonInteractiveClassName,
  onApply,
  onClose,
  open,
  template,
}: RecordTemplateFormSheetProps) => {
  const parsedTemplate = React.useMemo(
    () =>
      template
        ? structuredTemplate.parseStructuredTemplate(template.text)
        : null,
    [template]
  );

  const [values, setValues] =
    React.useState<structuredTemplate.StructuredTemplateValues>({});

  const [attachments, setAttachments] =
    React.useState<TemplateAttachmentByFieldId>({});

  const [recordingFieldId, setRecordingFieldId] = React.useState<string | null>(
    null
  );

  const [linkFieldId, setLinkFieldId] = React.useState<string | null>(null);

  const [linkDefaultLabel, setLinkDefaultLabel] = React.useState<
    string | undefined
  >();

  const [isApplying, setIsApplying] = React.useState(false);

  React.useEffect(() => {
    if (!open || !parsedTemplate) {
      setValues({});
      setAttachments({});
      setLinkFieldId(null);
      setLinkDefaultLabel(undefined);
      setRecordingFieldId(null);
      setIsApplying(false);
      return;
    }

    setValues(getInitialValues(parsedTemplate));
    setAttachments({});
    setLinkFieldId(null);
    setLinkDefaultLabel(undefined);
    setRecordingFieldId(null);
    setIsApplying(false);
  }, [open, parsedTemplate]);

  const formItems = React.useMemo(
    () => (parsedTemplate ? getTemplateFormItems(parsedTemplate) : []),
    [parsedTemplate]
  );

  const attachmentSelections = React.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(attachments).map(([fieldId, attachment]) => [
          fieldId,
          !!attachment,
        ])
      ),
    [attachments]
  );

  const renderedTemplate = React.useMemo(
    () =>
      parsedTemplate
        ? structuredTemplate.renderStructuredTemplate(parsedTemplate, {
            attachments: attachmentSelections,
            values,
          })
        : null,
    [attachmentSelections, parsedTemplate, values]
  );

  const activeRecordingField = React.useMemo(
    () =>
      parsedTemplate?.fields.find((field) => field.id === recordingFieldId) ??
      null,
    [parsedTemplate?.fields, recordingFieldId]
  );

  const activeLinkField = React.useMemo(
    () =>
      parsedTemplate?.fields.find((field) => field.id === linkFieldId) ?? null,
    [linkFieldId, parsedTemplate?.fields]
  );

  const setFieldValue = React.useCallback(
    (fieldId: string, value: boolean | string) => {
      setValues((current) => ({ ...current, [fieldId]: value }));
    },
    []
  );

  const setFieldAttachment = React.useCallback(
    (fieldId: string, attachment?: RecordTemplateAttachment) => {
      setAttachments((current) => ({ ...current, [fieldId]: attachment }));
    },
    []
  );

  const handleApply = React.useCallback(async () => {
    if (!template || !parsedTemplate || !renderedTemplate?.isValid) return;
    setIsApplying(true);

    try {
      await onApply({
        attachments: parsedTemplate.fields.flatMap((field) => {
          const attachment = attachments[field.id];
          return attachment ? [attachment] : [];
        }),
        template,
        text: renderedTemplate.text,
      });

      onClose();
    } catch {
      // noop
    } finally {
      setIsApplying(false);
    }
  }, [
    attachments,
    onApply,
    onClose,
    parsedTemplate,
    renderedTemplate,
    template,
  ]);

  const handleDismiss = React.useCallback(() => {
    if (isApplying) return;
    onClose();
  }, [isApplying, onClose]);

  return (
    <>
      <Sheet
        onDismiss={handleDismiss}
        open={open && !!template && !!parsedTemplate}
        portalName="record-template-form"
        topInset={64}
      >
        <SheetFormScrollView
          centerFocusedInput
          centerTopInset={64}
          className="max-h-none md:max-h-none"
          contentContainerClassName="gap-4 p-8 md:p-8 items-stretch"
          keyboardAware={open && !!template && !!parsedTemplate}
          mode="layout"
          variant="default"
        >
          {template && parsedTemplate ? (
            <>
              {formItems.map((item) => {
                if (item.type === 'text') {
                  return (
                    <TemplateTextSegment key={item.key} text={item.text} />
                  );
                }

                if (item.type === 'hidden') {
                  return (
                    <TemplateTextSegment key={item.key} text={item.text} />
                  );
                }

                if (item.repeated) return null;

                return (
                  <TemplateFieldControl
                    key={item.key}
                    attachment={attachments[item.field.id]}
                    checkboxCheckedClassName={checkboxCheckedClassName}
                    field={item.field}
                    helperText={item.helperText}
                    label={item.label}
                    onOpenRecording={() => setRecordingFieldId(item.field.id)}
                    placeholder={item.placeholder}
                    value={values[item.field.id]}
                    onAttachmentChange={(attachment) =>
                      setFieldAttachment(item.field.id, attachment)
                    }
                    onOpenLink={() => {
                      setLinkFieldId(item.field.id);
                      setLinkDefaultLabel(item.label ?? item.field.value);
                    }}
                    onValueChange={(value) =>
                      setFieldValue(item.field.id, value)
                    }
                  />
                );
              })}
            </>
          ) : null}
        </SheetFormScrollView>
        <SheetFooter contentClassName="flex-row gap-4">
          <Button
            disabled={isApplying}
            onPress={handleDismiss}
            size="sm"
            variant="secondary"
            wrapperClassName="flex-1"
          >
            <Text>Cancel</Text>
          </Button>
          <Button
            className={continueButtonClassName}
            disabled={isApplying || !renderedTemplate?.isValid}
            onPress={handleApply}
            size="sm"
            variant="secondary"
            wrapperClassName="flex-1"
            interactiveClassName={
              continueButtonInteractiveClassName
                ? cn(
                    'active:opacity-90 web:hover:opacity-90',
                    continueButtonInteractiveClassName
                  )
                : undefined
            }
          >
            {isApplying ? (
              <Spinner color={continueButtonClassName ? 'white' : undefined} />
            ) : (
              <Text
                className={continueButtonClassName ? 'text-white' : undefined}
              >
                Record
              </Text>
            )}
          </Button>
        </SheetFooter>
      </Sheet>
      <TemplateRecordingSheet
        field={activeRecordingField}
        onClose={() => setRecordingFieldId(null)}
        open={open && !!activeRecordingField}
        onSave={(recording) => {
          if (!recordingFieldId) return;
          setFieldAttachment(recordingFieldId, recording);
          setRecordingFieldId(null);
        }}
      />
      <TemplateLinkSheet
        defaultLabel={linkDefaultLabel}
        field={activeLinkField}
        link={linkFieldId ? attachments[linkFieldId] : undefined}
        open={open && !!activeLinkField}
        onClose={() => {
          setLinkFieldId(null);
          setLinkDefaultLabel(undefined);
        }}
        onSave={(link) => {
          if (!linkFieldId) return;
          setFieldAttachment(linkFieldId, link);
          setLinkFieldId(null);
          setLinkDefaultLabel(undefined);
        }}
      />
    </>
  );
};

const TemplateTextSegment = ({ text }: { text: string }) => {
  const displayText = text.trim();
  if (!displayText) return null;

  return (
    <Text className="web:text-pretty web:whitespace-pre-wrap">
      {renderRecordMarkdownText({ text: displayText })}
    </Text>
  );
};

const TemplateFieldHelperText = ({ text }: { text?: string }) => {
  const displayText = text?.trim();
  if (!displayText) return null;

  return (
    <TextContext.Provider value="font-normal leading-normal text-placeholder text-xs">
      <Text className="pt-1.5 px-2 web:text-pretty web:whitespace-pre-wrap">
        {renderRecordMarkdownText({
          flattenListItems: true,
          linkClassName: 'text-placeholder',
          text: displayText,
        })}
      </Text>
    </TextContext.Provider>
  );
};

const getTemplateFormItems = (
  template: structuredTemplate.StructuredTemplate
) => {
  const fieldsById = new Map(template.fields.map((field) => [field.id, field]));
  const renderedFieldIds = new Set<string>();
  const items: TemplateFormItem[] = [];

  const appendText = (text: string, key: string) => {
    if (!text) return;
    const previous = items[items.length - 1];

    if (previous?.type === 'text') {
      previous.text += text;
      return;
    }

    items.push({ key, text, type: 'text' });
  };

  const appendHidden = (text: string, key: string) => {
    if (!text.trim()) return;
    const previous = items[items.length - 1];

    if (previous?.type === 'hidden') {
      previous.text += `\n${text}`;
      return;
    }

    items.push({ key, text, type: 'hidden' });
  };

  const appendHelper = (fieldId: string, text: string, key: string) => {
    if (!text.trim()) return;
    const previous = items[items.length - 1];

    if (previous?.type === 'field' && previous.field.id === fieldId) {
      previous.helperText = previous.helperText
        ? `${previous.helperText}\n${text}`
        : text;

      return;
    }

    items.push({ key, text, type: 'hidden' });
  };

  template.segments.forEach((segment, index) => {
    if (segment.type === 'text') {
      appendText(segment.text, `text:${index}`);
      return;
    }

    if (segment.type === 'hidden') {
      appendHidden(segment.text, `hidden:${index}`);
      return;
    }

    if (segment.type === 'helper') {
      appendHelper(segment.fieldId, segment.text, `helper:${index}`);
      return;
    }

    const field = fieldsById.get(segment.fieldId);
    if (!field) return;
    const repeated = renderedFieldIds.has(field.id);
    renderedFieldIds.add(field.id);

    const previousTextLabel = repeated
      ? undefined
      : extractPreviousFieldLabel(items);

    items.push({
      field,
      key: `field:${index}:${field.id}`,
      label: previousTextLabel,
      placeholder: getFieldControlPlaceholder(field),
      repeated,
      type: 'field',
    });
  });

  return items;
};

const extractPreviousFieldLabel = (items: TemplateFormItem[]) => {
  const previous = items[items.length - 1];

  const trimmedWhitespaceText =
    previous?.type === 'text' && !previous.text.trim() ? items.pop() : null;

  const item = items[items.length - 1];

  if (item?.type !== 'text' && item?.type !== 'hidden') {
    if (trimmedWhitespaceText) items.push(trimmedWhitespaceText);
    return undefined;
  }

  const label = extractLabelFromTextItem(item);
  if (!label && trimmedWhitespaceText) items.push(trimmedWhitespaceText);
  if (label && !item.text) items.pop();
  return label;
};

const extractLabelFromTextItem = (
  item:
    | Extract<TemplateFormItem, { type: 'hidden' }>
    | Extract<TemplateFormItem, { type: 'text' }>
) => {
  const text = item.text;
  const lineStart = text.lastIndexOf('\n') + 1;
  const beforeLine = text.slice(0, lineStart);
  const lineText = text.slice(lineStart);
  const labelMatch = lineText.match(/^(.*?)[:：]\s*$/);
  const label = labelMatch?.[1]?.trim();
  if (!label) return undefined;
  item.text = beforeLine;
  return label;
};

const TemplateFieldLabel = ({ label }: { label?: string }) =>
  label ? <Label>{label}</Label> : null;

const TemplateFieldControl = ({
  attachment,
  checkboxCheckedClassName,
  field,
  helperText,
  label,
  placeholder,
  onAttachmentChange,
  onOpenLink,
  onOpenRecording,
  onValueChange,
  value,
}: {
  attachment?: RecordTemplateAttachment;
  checkboxCheckedClassName?: string;
  field: structuredTemplate.StructuredTemplateField;
  helperText?: string;
  label?: string;
  placeholder?: string;
  onAttachmentChange: (attachment?: RecordTemplateAttachment) => void;
  onOpenLink: () => void;
  onOpenRecording: () => void;
  onValueChange: (value: boolean | string) => void;
  value?: boolean | string;
}) => {
  if (field.type === 'paragraph') {
    return (
      <TemplateParagraphField
        helperText={helperText}
        label={label}
        onChangeText={onValueChange}
        placeholder={placeholder}
        value={getStringValue(value)}
      />
    );
  }

  if (field.type === 'checkbox') {
    return (
      <TemplateCheckboxField
        checkedClassName={checkboxCheckedClassName}
        field={field}
        helperText={helperText}
        label={label}
        onChange={onValueChange}
        placeholder={placeholder}
        value={value === true}
      />
    );
  }

  if (structuredTemplate.isAttachmentField(field)) {
    return (
      <TemplateAttachmentField
        attachment={attachment}
        field={field}
        helperText={helperText}
        label={label}
        onAttachmentChange={onAttachmentChange}
        onOpenLink={onOpenLink}
        onOpenRecording={onOpenRecording}
        placeholder={placeholder}
      />
    );
  }

  return (
    <View>
      <TemplateFieldLabel label={label} />
      {field.type === 'number' ? (
        <NumberInput
          onChangeText={onValueChange}
          placeholder={placeholder ?? ''}
          size="sm"
          value={getStringValue(value)}
        />
      ) : (
        <Input
          onChangeText={onValueChange}
          placeholder={placeholder ?? ''}
          size="sm"
          value={getStringValue(value)}
        />
      )}
      <TemplateFieldHelperText text={helperText} />
    </View>
  );
};

const TemplateParagraphField = ({
  helperText,
  label,
  placeholder,
  onChangeText,
  value,
}: {
  helperText?: string;
  label?: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  value: string;
}) => (
  <View>
    <TemplateFieldLabel label={label} />
    <Textarea
      maxRows={5}
      minRows={1}
      onChangeText={onChangeText}
      placeholder={placeholder ?? ''}
      size="sm"
      value={value}
    />
    <TemplateFieldHelperText text={helperText} />
  </View>
);

const TemplateCheckboxField = ({
  checkedClassName,
  field,
  helperText,
  label,
  placeholder,
  onChange,
  value,
}: {
  checkedClassName?: string;
  field: structuredTemplate.StructuredTemplateField;
  helperText?: string;
  label?: string;
  placeholder?: string;
  onChange: (value: boolean) => void;
  value: boolean;
}) => (
  <View>
    <Button
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      aria-checked={value}
      className="w-full justify-start"
      onPress={() => onChange(!value)}
      role="checkbox"
      size="sm"
      variant="secondary"
      wrapperClassName="w-full"
    >
      <View
        className={cn(
          'size-5 shrink-0 items-center justify-center rounded-md border border-border-secondary border-continuous bg-secondary',
          value && 'border-transparent',
          value && (checkedClassName ?? 'bg-primary')
        )}
      >
        {value ? (
          <Icon className="text-primary-foreground" icon={Check} size={14} />
        ) : null}
      </View>
      <TextContext.Provider value={undefined}>
        <Text className="flex-1 font-normal text-foreground" numberOfLines={1}>
          {label ?? getFieldPlaceholder(field, placeholder)}
        </Text>
      </TextContext.Provider>
    </Button>
    <TemplateFieldHelperText text={helperText} />
  </View>
);

const TemplateAttachmentField = ({
  attachment,
  field,
  helperText,
  label,
  placeholder,
  onAttachmentChange,
  onOpenLink,
  onOpenRecording,
}: {
  attachment?: RecordTemplateAttachment;
  field: structuredTemplate.StructuredTemplateField;
  helperText?: string;
  label?: string;
  placeholder?: string;
  onAttachmentChange: (attachment?: RecordTemplateAttachment) => void;
  onOpenLink: () => void;
  onOpenRecording: () => void;
}) => {
  const attachmentLabel = getAttachmentLabel(attachment);
  const attachmentMetaText = getAttachmentMetaText(attachment);

  const AttachmentIcon =
    field.type === 'file'
      ? UploadSimple
      : field.type === 'link'
        ? LinkIcon
        : Microphone;

  const handlePickFile = React.useCallback(async () => {
    const picker = await getDocumentAsync({
      base64: false,
      copyToCacheDirectory: true,
      multiple: false,
      type: pickedFiles.FILE_PICKER_MIME_TYPES,
    });

    if (picker.canceled) return;
    const pickedAsset = picker.assets?.[0];
    if (!pickedAsset) return;
    const asset = pickedFiles.normalizeDocumentPickerAsset(pickedAsset);
    if (!asset) return;
    onAttachmentChange({ asset, type: 'file' });
  }, [onAttachmentChange]);

  const handleOpenAttachment = React.useCallback(() => {
    if (field.type === 'file') {
      void handlePickFile();
      return;
    }

    if (field.type === 'link') {
      onOpenLink();
      return;
    }

    onOpenRecording();
  }, [field.type, handlePickFile, onOpenLink, onOpenRecording]);

  if (!attachment) {
    return (
      <View>
        <TemplateFieldLabel label={label} />
        <Button
          className="w-full justify-start"
          onPress={handleOpenAttachment}
          size="sm"
          variant="secondary"
          wrapperClassName="w-full"
        >
          <Icon className="text-muted-foreground" icon={AttachmentIcon} />
          <Text className="flex-1 text-muted-foreground" numberOfLines={1}>
            {getFieldPlaceholder(field, placeholder)}
          </Text>
        </Button>
        <TemplateFieldHelperText text={helperText} />
      </View>
    );
  }

  return (
    <View>
      <TemplateFieldLabel label={label} />
      <Button
        className="w-full justify-start"
        onPress={handleOpenAttachment}
        size="sm"
        variant="secondary"
        wrapperClassName="w-full"
      >
        <Icon className="text-muted-foreground" icon={AttachmentIcon} />
        <View className="flex-1 flex-row min-w-0 gap-4 items-baseline justify-between">
          <Text className="shrink" numberOfLines={1}>
            {attachmentLabel}
          </Text>
          {attachmentMetaText ? (
            <Text
              className="max-w-[45%] font-normal text-placeholder text-xs shrink-0"
              ellipsizeMode={attachment.type === 'link' ? 'head' : 'tail'}
              numberOfLines={1}
            >
              {attachmentMetaText}
            </Text>
          ) : null}
        </View>
      </Button>
      <TemplateFieldHelperText text={helperText} />
    </View>
  );
};

const TemplateLinkSheet = ({
  defaultLabel,
  field,
  link,
  onClose,
  onSave,
  open,
}: {
  defaultLabel?: string;
  field: structuredTemplate.StructuredTemplateField | null;
  link?: RecordTemplateAttachment;
  onClose: () => void;
  onSave: (attachment: RecordTemplateAttachment) => void;
  open: boolean;
}) => {
  const existingLink = link?.type === 'link' ? link : undefined;
  const [label, setLabel] = React.useState('');
  const [url, setUrl] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setLabel('');
      setUrl('');
      return;
    }

    setLabel(existingLink?.label ?? defaultLabel ?? '');
    setUrl(existingLink?.url ?? '');
  }, [defaultLabel, existingLink?.label, existingLink?.url, open]);

  const normalizedUrl = React.useMemo(
    () => linkUrl.normalizeLinkUrl(url),
    [url]
  );

  const trimmedLabel = label.trim();
  const canSave = !!trimmedLabel && !!normalizedUrl;

  const handleSave = React.useCallback(() => {
    if (!canSave || !normalizedUrl) return;
    onSave({ label: trimmedLabel, type: 'link', url: normalizedUrl });
  }, [canSave, normalizedUrl, onSave, trimmedLabel]);

  return (
    <Sheet
      onDismiss={onClose}
      open={open && !!field}
      portalName="record-template-link"
      topInset={64}
      width="narrow"
    >
      <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 md:p-8">
        <View>
          <Field
            autoFocus
            label="Label"
            maxLength={120}
            onChangeText={setLabel}
            placeholder="Website"
            returnKeyType="next"
            value={label}
          />
        </View>
        <View className="mt-4">
          <Field
            autoCapitalize="none"
            keyboardType="url"
            label="URL"
            maxLength={2048}
            onChangeText={setUrl}
            placeholder="https://example.com"
            value={url}
            onSubmitEditing={() => {
              if (canSave) handleSave();
            }}
          />
          {!!url.trim() && !normalizedUrl && (
            <Text className="pt-1.5 px-2 text-destructive text-sm">
              Enter a valid URL.
            </Text>
          )}
        </View>
        <View className="flex-row mt-8 gap-4">
          <Button
            onPress={onClose}
            size="sm"
            variant="secondary"
            wrapperClassName="flex-1"
          >
            <Text>Cancel</Text>
          </Button>
          <Button
            disabled={!canSave}
            onPress={handleSave}
            size="sm"
            wrapperClassName="flex-1"
          >
            <Text>{existingLink ? 'Save' : 'Add'}</Text>
          </Button>
        </View>
      </View>
    </Sheet>
  );
};

const TemplateRecordingSheet = ({
  field,
  onClose,
  onSave,
  open,
}: {
  field: structuredTemplate.StructuredTemplateField | null;
  onClose: () => void;
  onSave: (attachment: RecordTemplateAttachment) => void;
  open: boolean;
}) => {
  const recorder = useAudioRecorder();

  const {
    duration,
    hasPermission,
    isRecording,
    record: startRecording,
    reset,
    startError,
    stop,
    uri,
  } = recorder;

  const [isSaving, setIsSaving] = React.useState(false);
  const isClosingRef = React.useRef(false);

  React.useEffect(() => {
    if (!open) {
      isClosingRef.current = false;
      return;
    }

    if (
      !isClosingRef.current &&
      hasPermission !== false &&
      duration === 0 &&
      !startError &&
      !isRecording &&
      !uri
    ) {
      void startRecording();
    }
  }, [
    duration,
    hasPermission,
    isRecording,
    open,
    startError,
    startRecording,
    uri,
  ]);

  const handleCancel = React.useCallback(async () => {
    if (isSaving) return;
    isClosingRef.current = true;

    try {
      if (isRecording) await stop();
    } finally {
      reset();
      onClose();
    }
  }, [isRecording, isSaving, onClose, reset, stop]);

  React.useEffect(() => {
    if (open && hasPermission === false) {
      isClosingRef.current = true;
      reset();
      onClose();
    }
  }, [hasPermission, onClose, open, reset]);

  const handleSave = React.useCallback(async () => {
    if (isSaving) return;
    isClosingRef.current = true;
    setIsSaving(true);

    try {
      let nextUri = uri;
      if (isRecording) nextUri = await stop();

      if (!nextUri) {
        isClosingRef.current = false;
        return;
      }

      onSave({
        duration: durationSecondsToMs(duration),
        type: 'recording',
        uri: nextUri,
      });

      reset();
    } finally {
      setIsSaving(false);
    }
  }, [duration, isRecording, isSaving, onSave, reset, stop, uri]);

  return (
    <Sheet
      onDismiss={handleCancel}
      open={open && !!field}
      portalName="record-template-recording"
      width="narrow"
    >
      <AudioSheetContent
        activeMicBackgroundClassName="bg-primary"
        activeMicBorderClassName="border-primary"
        activeMicIconClassName="text-primary"
        canSave={!!isRecording || !!uri}
        duration={duration}
        isMicActive={isRecording && !isSaving}
        isUploading={isSaving}
        onCancel={handleCancel}
        onSave={handleSave}
        startError={startError}
      />
    </Sheet>
  );
};

const getInitialValues = (template: structuredTemplate.StructuredTemplate) =>
  Object.fromEntries(
    template.fields.flatMap((field) => {
      if (structuredTemplate.isAttachmentField(field)) return [];

      return [
        [field.id, field.type === 'checkbox' ? false : (field.value ?? '')],
      ];
    })
  );

const getStringValue = (value?: boolean | string) =>
  typeof value === 'string' ? value : '';

const getFieldControlPlaceholder = (
  field: structuredTemplate.StructuredTemplateField
) => {
  if (
    field.type === 'checkbox' ||
    structuredTemplate.isAttachmentField(field)
  ) {
    return field.value;
  }
};

const getFieldPlaceholder = (
  field: structuredTemplate.StructuredTemplateField,
  placeholder?: string
) => {
  if (placeholder) return placeholder;
  if (field.type === 'checkbox') return 'Checkbox';
  if (field.type === 'file') return 'Upload file';
  if (field.type === 'link') return 'Add link';
  if (field.type === 'number') return 'Number';
  if (field.type === 'paragraph') return 'Paragraph';
  if (field.type === 'recording') return 'Record';
  return 'Text';
};

const getAttachmentLabel = (attachment?: RecordTemplateAttachment) => {
  if (!attachment) return '';

  if (attachment.type === 'file') {
    return attachment.asset.fileName ?? 'Selected file';
  }

  if (attachment.type === 'link') return attachment.label;
  return 'Recording';
};

const getAttachmentMetaText = (attachment?: RecordTemplateAttachment) => {
  if (!attachment) return '';

  if (attachment.type === 'file') {
    return formatFileSize(attachment.asset.size) ?? 'Unknown size';
  }

  if (attachment.type === 'link') {
    return linkUrl.getLinkUrlDisplayText(attachment.url);
  }

  return formatTime(durationMsToSeconds(attachment.duration) ?? 0);
};
