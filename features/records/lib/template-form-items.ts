import * as structuredTemplate from '@/features/logs/lib/structured-template';
import { parseTemplateLabel } from '@/features/records/lib/template-label';

export type TemplateFormItem =
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

export const getTemplateFormItems = (
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
  if (label && !item.text.trim()) items.pop();
  return label;
};

const extractLabelFromTextItem = (
  item:
    | Extract<TemplateFormItem, { type: 'hidden' }>
    | Extract<TemplateFormItem, { type: 'text' }>
) => {
  // Drop a single trailing newline so a label on its own line (Label:\n[field])
  // is matched like an inline one (Label: [field]). parseTemplateLabel ignores
  // markdown, so emphasized labels (**Notes:**, *Mood:*) resolve the same.
  const text = item.text.replace(/\n$/, '');
  const lineStart = text.lastIndexOf('\n') + 1;
  const label = parseTemplateLabel(text.slice(lineStart));
  if (!label) return undefined;
  item.text = text.slice(0, lineStart);
  return label;
};

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
