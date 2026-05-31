export const STRUCTURED_TEMPLATE_TEXT_MAX_LENGTH = 10240;

export type StructuredTemplateFieldType =
  | 'checkbox'
  | 'file'
  | 'link'
  | 'number'
  | 'paragraph'
  | 'recording'
  | 'text';

export type StructuredTemplateInlineFieldType = Exclude<
  StructuredTemplateFieldType,
  'file' | 'link' | 'recording'
>;

export type StructuredTemplateAttachmentFieldType = Extract<
  StructuredTemplateFieldType,
  'file' | 'link' | 'recording'
>;

export type StructuredTemplateField = {
  id: string;
  occurrenceCount: number;
  source: string;
  type: StructuredTemplateFieldType;
  value?: string;
};

export type StructuredTemplateSegment =
  | { text: string; type: 'text' }
  | { source: string; text: string; type: 'hidden' }
  | { fieldId: string; text: string; type: 'helper' }
  | { fieldId: string; source: string; type: 'field' };

export type StructuredTemplate = {
  fields: StructuredTemplateField[];
  segments: StructuredTemplateSegment[];
  text: string;
};

export type StructuredTemplateValues = Record<string, boolean | string>;

export type StructuredTemplateAttachmentValues = Record<string, boolean>;

export type StructuredTemplateRenderResult = {
  hasAttachments: boolean;
  hasContent: boolean;
  isValid: boolean;
  text: string;
  textError?: string;
};

const SUPPORTED_FIELD_TYPES = new Set<StructuredTemplateFieldType>([
  'checkbox',
  'file',
  'link',
  'number',
  'paragraph',
  'recording',
  'text',
]);

const GENERIC_LABEL_BY_TYPE: Record<StructuredTemplateFieldType, string> = {
  checkbox: 'Checkbox',
  file: 'File',
  link: 'Link',
  number: 'Number',
  paragraph: 'Paragraph',
  recording: 'Recording',
  text: 'Text',
};

type ParsedPlaceholder = Omit<
  StructuredTemplateField,
  'id' | 'occurrenceCount' | 'source'
>;

export const getStructuredTemplateFieldDisplayLabel = (
  field: Pick<StructuredTemplateField, 'type' | 'value'>
) => field.value || GENERIC_LABEL_BY_TYPE[field.type];

export const structuredTemplateHasFields = (text: string) => {
  const template = parseStructuredTemplate(text);
  return hasStructuredTemplateSyntax(template);
};

export const parseStructuredTemplate = (text: string): StructuredTemplate => {
  const segments: StructuredTemplateSegment[] = [];
  const fields: StructuredTemplateField[] = [];
  const fieldsById = new Map<string, StructuredTemplateField>();
  let cursor = 0;

  const appendText = (nextText: string) => {
    if (!nextText) return;
    const previous = segments[segments.length - 1];

    if (previous?.type === 'text') {
      previous.text += nextText;
      return;
    }

    segments.push({ text: nextText, type: 'text' });
  };

  while (cursor < text.length) {
    const fieldStart = text.indexOf('[', cursor);
    const hiddenStart = text.indexOf('{{', cursor);
    const start = getNextTokenStart(fieldStart, hiddenStart);

    if (start < 0) {
      appendText(text.slice(cursor));
      break;
    }

    appendText(text.slice(cursor, start));

    if (start === hiddenStart) {
      const end = text.indexOf('}}', start + 2);

      if (end < 0) {
        appendText(text.slice(start));
        break;
      }

      segments.push({
        source: text.slice(start, end + 2),
        text: text.slice(start + 2, end),
        type: 'hidden',
      });

      cursor = end + 2;
      continue;
    }

    const end = text.indexOf(']', start + 1);

    if (end < 0) {
      appendText(text.slice(start));
      break;
    }

    const source = text.slice(start, end + 1);
    const parsed = parsePlaceholderContent(text.slice(start + 1, end));

    if (!parsed) {
      appendText(source);
      cursor = end + 1;
      continue;
    }

    const id = getFieldId(parsed, fields.length);
    const existingField = fieldsById.get(id);

    if (existingField) {
      existingField.occurrenceCount += 1;
    } else {
      const field = { ...parsed, id, occurrenceCount: 1, source };
      fieldsById.set(id, field);
      fields.push(field);
    }

    segments.push({ fieldId: id, source, type: 'field' });
    cursor = end + 1;
  }

  return {
    fields,
    segments: extractHelperSegments(segments, fieldsById),
    text,
  };
};

export const formatStructuredTemplatePreview = (text: string) => {
  const template = parseStructuredTemplate(text);
  if (!hasStructuredTemplateSyntax(template)) return formatPreviewText(text);

  return formatPreviewText(
    template.segments
      .map((segment) => {
        if (segment.type === 'text') return segment.text;
        if (segment.type === 'hidden' || segment.type === 'helper') return '';
        return segment.source;
      })
      .join('')
  );
};

const hasStructuredTemplateSyntax = (template: StructuredTemplate) =>
  template.fields.length > 0 ||
  template.segments.some(
    (segment) => segment.type === 'hidden' || segment.type === 'helper'
  );

export const renderStructuredTemplate = (
  template: StructuredTemplate,
  {
    attachments = {},
    maxLength = STRUCTURED_TEMPLATE_TEXT_MAX_LENGTH,
    values = {},
  }: {
    attachments?: StructuredTemplateAttachmentValues;
    maxLength?: number;
    values?: StructuredTemplateValues;
  } = {}
): StructuredTemplateRenderResult => {
  const fieldsById = getFieldsById(template.fields);

  const text = cleanupRenderedTemplateText(
    template.segments
      .map((segment) => {
        if (segment.type === 'text') return segment.text;
        if (segment.type === 'hidden' || segment.type === 'helper') return '';
        const field = fieldsById.get(segment.fieldId);
        if (!field) return segment.source;
        return renderFieldValue(field, values[field.id]);
      })
      .join('')
  );

  const hasAttachments = template.fields.some(
    (field) => isAttachmentField(field) && !!attachments[field.id]
  );

  const textError =
    text.length > maxLength
      ? `Record text must be ${maxLength.toLocaleString()} characters or less.`
      : undefined;

  const hasContent = text.trim().length > 0 || hasAttachments;

  return {
    hasAttachments,
    hasContent,
    isValid: !textError && hasContent,
    text,
    textError,
  };
};

export const cleanupRenderedTemplateText = (text: string) =>
  text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const isAttachmentField = (
  field: Pick<StructuredTemplateField, 'type'>
): field is StructuredTemplateField & {
  type: StructuredTemplateAttachmentFieldType;
} =>
  field.type === 'file' || field.type === 'link' || field.type === 'recording';

const getFieldsById = (fields: StructuredTemplateField[]) =>
  new Map(fields.map((field) => [field.id, field]));

const formatPreviewText = (text: string) => text.replace(/\s+/g, ' ').trim();

const extractHelperSegments = (
  segments: StructuredTemplateSegment[],
  fieldsById: Map<string, StructuredTemplateField>
) => {
  const nextSegments: StructuredTemplateSegment[] = [];

  segments.forEach((segment, index) => {
    const previousSegment = nextSegments[nextSegments.length - 1];

    const previousField =
      previousSegment?.type === 'field'
        ? fieldsById.get(previousSegment.fieldId)
        : undefined;

    if (
      segment.type !== 'text' ||
      previousSegment?.type !== 'field' ||
      !previousField ||
      isAttachmentField(previousField)
    ) {
      nextSegments.push(segment);
      return;
    }

    const split = splitLeadingHelperText(segment.text, segments[index + 1]);

    if (!split) {
      nextSegments.push(segment);
      return;
    }

    nextSegments.push({
      fieldId: previousSegment.fieldId,
      text: split.helperText,
      type: 'helper',
    });

    if (split.remainingText) {
      nextSegments.push({ text: split.remainingText, type: 'text' });
    }
  });

  return nextSegments;
};

const splitLeadingHelperText = (
  text: string,
  nextSegment?: StructuredTemplateSegment
) => {
  if (!text.startsWith('\n')) return null;
  const body = text.slice(1);
  if (!body || body.startsWith('\n')) return null;
  const helperLines: string[] = [];
  let cursor = 0;

  while (cursor < body.length) {
    const lineEnd = body.indexOf('\n', cursor);
    const isLastLine = lineEnd < 0;
    const line = isLastLine ? body.slice(cursor) : body.slice(cursor, lineEnd);
    if (!line.trim()) break;
    if (line.includes('[') || line.includes(']')) break;
    if (isLastLine && nextSegment?.type === 'field') break;
    helperLines.push(line);
    cursor = isLastLine ? body.length : lineEnd + 1;
  }

  if (!helperLines.length) return null;
  const remainingBody = body.slice(cursor);

  return {
    helperText: helperLines.join('\n'),
    remainingText: remainingBody ? `\n${remainingBody}` : '',
  };
};

const getNextTokenStart = (fieldStart: number, hiddenStart: number) => {
  if (fieldStart < 0) return hiddenStart;
  if (hiddenStart < 0) return fieldStart;
  return Math.min(fieldStart, hiddenStart);
};

const parsePlaceholderContent = (content: string): ParsedPlaceholder | null => {
  if (!content || /[\r\n]/.test(content)) return null;
  const match = content.match(/^([a-z]+)(\?)?/);
  if (!match) return null;
  const type = match[1] as StructuredTemplateFieldType;
  if (!SUPPORTED_FIELD_TYPES.has(type)) return null;
  const rest = content.slice(match[0].length);
  if (!rest) return { type };
  if (!rest.startsWith(':') || rest.includes('|')) return null;
  const value = rest.slice(1).trim();
  if (!isValidValue(value)) return null;
  return { type, value: value || undefined };
};

const isValidValue = (value: string) =>
  !value.includes('[') && !value.includes(']');

const getFieldId = ({ type }: ParsedPlaceholder, nextFieldIndex: number) =>
  JSON.stringify([type, nextFieldIndex]);

const renderFieldValue = (
  field: StructuredTemplateField,
  value: boolean | string | undefined
) => {
  if (isAttachmentField(field)) return '';
  if (field.type === 'checkbox') return value === true ? 'Yes' : 'No';

  const textValue =
    typeof value === 'string' ? value.trim() : (field.value?.trim() ?? '');

  if (!textValue) return '';
  return textValue;
};
