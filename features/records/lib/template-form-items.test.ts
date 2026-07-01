import { parseStructuredTemplate } from '@/features/logs/lib/structured-template';
import { getTemplateFormItems } from '@/features/records/lib/template-form-items';
import { describe, expect, test } from 'bun:test';

const fieldLabel = (text: string) => {
  const items = getTemplateFormItems(parseStructuredTemplate(text));
  const field = items.find((item) => item.type === 'field');
  return field?.type === 'field' ? field.label : undefined;
};

describe('getTemplateFormItems', () => {
  test('labels inline fields plain and formatted', () => {
    expect(fieldLabel('Sleep: [number]')).toBe('Sleep');
    expect(fieldLabel('**Sleep:** [number]')).toBe('Sleep');
    expect(fieldLabel('**Sleep**: [number]')).toBe('Sleep');
    expect(fieldLabel('*Mood:* [text]')).toBe('Mood');
  });

  test('labels fields on their own line', () => {
    expect(fieldLabel('Sleep:\n[number]')).toBe('Sleep');
    expect(fieldLabel('**Sleep:**\n[number]')).toBe('Sleep');
  });

  test('keeps preceding text and only consumes the label line', () => {
    const items = getTemplateFormItems(
      parseStructuredTemplate('Intro\n**Mood:** [text]')
    );

    expect(items.map((item) => item.type)).toEqual(['text', 'field']);
    const [intro, field] = items;
    expect(intro.type === 'text' && intro.text).toBe('Intro\n');
    expect(field.type === 'field' && field.label).toBe('Mood');
  });

  test('labels a bold field with no colon', () => {
    expect(fieldLabel('**Duration (seconds)** [number:0]')).toBe(
      'Duration (seconds)'
    );
  });

  test('leaves non-label text as a segment', () => {
    const items = getTemplateFormItems(
      parseStructuredTemplate('Some note\n[text]')
    );

    expect(items.map((item) => item.type)).toEqual(['text', 'field']);
    expect(fieldLabel('Some note\n[text]')).toBeUndefined();
  });

  test('labels each field in a real template', () => {
    const items = getTemplateFormItems(
      parseStructuredTemplate(
        [
          '{{**Separation Session — Milo**}}',
          '',
          '**Duration (seconds)** [number:0]',
          '',
          '[checkbox:Stayed relaxed]',
          '',
          'Notes: [paragraph]',
          'Stress signals, what worked, plan for next time…',
        ].join('\n')
      )
    );

    const fields = items.filter((item) => item.type === 'field');

    expect(
      fields.map((field) => field.type === 'field' && field.field.type)
    ).toEqual(['number', 'checkbox', 'paragraph']);

    expect(
      fields.map((field) => field.type === 'field' && field.label)
    ).toEqual(['Duration (seconds)', undefined, 'Notes']);
  });
});
