import * as structuredTemplate from '@/features/logs/lib/structured-template';
import { describe, expect, test } from 'bun:test';

const separationTemplate = [
  'Alone duration (min): [number:0]',
  '',
  '{{Longest planned absence completed before return.}}',
  '',
  '{{---}}',
  '',
  'Peak distress (0-5): [number:5]',
  '',
  '{{',
  '0. Asleep/fully relaxed',
  '1. Relaxed alert',
  '2. Mild checking/brief whine',
  '3. Pacing/repeated whine',
  '4. Barking/scratching/panting',
  '5. Panic or unsafe behavior',
  '}}',
  '',
  '{{---}}',
  '',
  '{{Notes:}} [paragraph]',
].join('\n');

const helperTemplate = [
  'Alone duration (min): [number:0]',
  'Peak distress (0-5): [number:0]',
  '0. Asleep/fully relaxed',
  '1. Relaxed alert',
  '2. Mild checking/brief whine',
  '3. Pacing/repeated whine',
  '4. Barking/scratching/panting',
  '5. Panic or unsafe behavior',
  '',
  '{{Notes:}} [paragraph]',
  '',
  '[file:Video of the session]',
].join('\n');

const getField = (
  template: structuredTemplate.StructuredTemplate,
  type: structuredTemplate.StructuredTemplateFieldType,
  value?: string
) => {
  const field = template.fields.find(
    (item) =>
      item.type === type && (value === undefined || item.value === value)
  );

  if (!field) throw new Error(`Missing field: ${type}:${value ?? ''}`);
  return field;
};

describe('parseStructuredTemplate', () => {
  test('parses fields', () => {
    const template = structuredTemplate.parseStructuredTemplate(
      [
        'Title [text:Title]',
        'Body [paragraph:Notes]',
        'Link [link:URL]',
        'Count [number:Count]',
        'Done [checkbox:Finished]',
      ].join('\n')
    );

    expect(template.fields.map((field) => field.type)).toEqual([
      'text',
      'paragraph',
      'link',
      'number',
      'checkbox',
    ]);
  });

  test('keeps literals', () => {
    const text =
      '[unknown:Thing] [text:Open [select:Bad] [date:When] [datetime:When] [text:Ok]';

    const template = structuredTemplate.parseStructuredTemplate(text);
    expect(template.fields).toHaveLength(1);
    expect(getField(template, 'text', 'Ok')).toBeTruthy();

    expect(
      structuredTemplate.renderStructuredTemplate(template, {
        values: { [getField(template, 'text', 'Ok').id]: 'fine' },
      }).text
    ).toBe(
      '[unknown:Thing] [text:Open [select:Bad] [date:When] [datetime:When] fine'
    );
  });

  test('keeps hidden text out of output', () => {
    const template = structuredTemplate.parseStructuredTemplate(
      ['Visible', '{{Hidden', 'lines}}', '[text:Done]'].join('\n')
    );

    expect(template.fields).toHaveLength(1);

    expect(template.segments.some((segment) => segment.type === 'hidden')).toBe(
      true
    );

    expect(structuredTemplate.renderStructuredTemplate(template).text).toBe(
      ['Visible', '', 'Done'].join('\n')
    );

    expect(
      structuredTemplate.formatStructuredTemplatePreview(template.text)
    ).toBe('Visible Hidden lines Done');
  });

  test('supports hidden guidance', () => {
    const template =
      structuredTemplate.parseStructuredTemplate(separationTemplate);

    expect(template.fields.map((field) => field.type)).toEqual([
      'number',
      'number',
      'paragraph',
    ]);

    expect(template.fields.map((field) => field.value)).toEqual([
      '0',
      '5',
      undefined,
    ]);

    expect(
      template.segments.filter((segment) => segment.type === 'hidden')
    ).toHaveLength(5);

    expect(structuredTemplate.renderStructuredTemplate(template).text).toBe(
      ['Alone duration (min): 0', '', 'Peak distress (0-5): 5'].join('\n')
    );

    expect(
      structuredTemplate.formatStructuredTemplatePreview(template.text)
    ).toBe(
      [
        'Alone duration (min): 0',
        'Longest planned absence completed before return.',
        '---',
        'Peak distress (0-5): 5',
        '0. Asleep/fully relaxed',
        '1. Relaxed alert',
        '2. Mild checking/brief whine',
        '3. Pacing/repeated whine',
        '4. Barking/scratching/panting',
        '5. Panic or unsafe behavior',
        '---',
        'Notes: Paragraph',
      ].join(' ')
    );
  });

  test('extracts input helper text', () => {
    const template = structuredTemplate.parseStructuredTemplate(helperTemplate);

    const helperSegments = template.segments.filter(
      (
        segment
      ): segment is Extract<
        structuredTemplate.StructuredTemplateSegment,
        { type: 'helper' }
      > => segment.type === 'helper'
    );

    expect(template.fields.map((field) => field.type)).toEqual([
      'number',
      'number',
      'paragraph',
      'file',
    ]);

    expect(helperSegments).toHaveLength(1);
    expect(helperSegments[0].text).toContain('0. Asleep/fully relaxed');
    expect(helperSegments[0].text).toContain('5. Panic or unsafe behavior');

    expect(structuredTemplate.renderStructuredTemplate(template).text).toBe(
      ['Alone duration (min): 0', 'Peak distress (0-5): 0'].join('\n')
    );

    expect(
      structuredTemplate.formatStructuredTemplatePreview(template.text)
    ).toBe(
      [
        'Alone duration (min): 0',
        'Peak distress (0-5): 0',
        '0. Asleep/fully relaxed',
        '1. Relaxed alert',
        '2. Mild checking/brief whine',
        '3. Pacing/repeated whine',
        '4. Barking/scratching/panting',
        '5. Panic or unsafe behavior',
        'Notes: Paragraph',
        'Video of the session',
      ].join(' ')
    );
  });

  test('keeps field lines out of helper text', () => {
    const template = structuredTemplate.parseStructuredTemplate(
      'First: [number:0]\nSecond: [number:0]\nScale note'
    );

    const helperSegments = template.segments.filter(
      (segment) => segment.type === 'helper'
    );

    expect(template.fields).toHaveLength(2);
    expect(helperSegments).toHaveLength(1);

    expect(structuredTemplate.renderStructuredTemplate(template).text).toBe(
      ['First: 0', 'Second: 0'].join('\n')
    );
  });

  test('detects hidden-only templates', () => {
    const template = structuredTemplate.parseStructuredTemplate('{{Hidden}}');
    expect(template.fields).toHaveLength(0);
    expect(structuredTemplate.renderStructuredTemplate(template).text).toBe('');

    expect(
      structuredTemplate.formatStructuredTemplatePreview('{{Hidden}}')
    ).toBe('Hidden');

    expect(structuredTemplate.structuredTemplateHasFields('{{Hidden}}')).toBe(
      true
    );
  });

  test('keeps repeated values separate', () => {
    const template = structuredTemplate.parseStructuredTemplate(
      '[text:Name] checked in with [text:Name]'
    );

    const fields = template.fields.filter((field) => field.type === 'text');

    const rendered = structuredTemplate.renderStructuredTemplate(template, {
      values: { [fields[0].id]: 'Cade', [fields[1].id]: 'Ada' },
    });

    expect(fields).toHaveLength(2);
    expect(new Set(fields.map((field) => field.id)).size).toBe(2);
    expect(rendered.text).toBe('Cade checked in with Ada');
  });

  test('keeps matching default values separate', () => {
    const template = structuredTemplate.parseStructuredTemplate(
      'Alone duration (min): [number:0]\nPeak distress (0-5): [number:0]'
    );

    const fields = template.fields.filter((field) => field.type === 'number');
    expect(fields).toHaveLength(2);
    expect(fields.map((field) => field.value)).toEqual(['0', '0']);
    expect(new Set(fields.map((field) => field.id)).size).toBe(2);
  });

  test('keeps unlabeled repeats separate', () => {
    const template = structuredTemplate.parseStructuredTemplate(
      [
        'Alone duration (min): [number]',
        'Peak distress (0-5): [number]',
        '',
        '[paragraph:Notes]',
      ].join('\n')
    );

    const numberFields = template.fields.filter(
      (field) => field.type === 'number'
    );

    expect(numberFields).toHaveLength(2);
    expect(new Set(numberFields.map((field) => field.id)).size).toBe(2);

    expect(
      structuredTemplate.renderStructuredTemplate(template, {
        values: {
          [numberFields[0].id]: '30',
          [numberFields[1].id]: '4',
          [getField(template, 'paragraph', 'Notes').id]: 'Barked once',
        },
      }).text
    ).toBe(
      [
        'Alone duration (min): 30',
        'Peak distress (0-5): 4',
        '',
        'Barked once',
      ].join('\n')
    );
  });

  test('supports no values', () => {
    const template = structuredTemplate.parseStructuredTemplate(
      '[text] [file] [recording] [link]'
    );

    expect(
      template.fields.map((field) =>
        structuredTemplate.getStructuredTemplateFieldDisplayLabel(field)
      )
    ).toEqual(['Text', 'File', 'Recording', 'Link']);
  });

  test('keeps select literal', () => {
    const template = structuredTemplate.parseStructuredTemplate(
      '[select:Status|A|B]'
    );

    expect(template.fields).toHaveLength(0);

    expect(structuredTemplate.renderStructuredTemplate(template).text).toBe(
      '[select:Status|A|B]'
    );
  });
});

describe('renderStructuredTemplate', () => {
  test('renders values', () => {
    const template = structuredTemplate.parseStructuredTemplate(
      [
        'Title: [text:Title]',
        '[paragraph:Notes]',
        'Count: [number:Count]',
        'Done: [checkbox:Finished]',
      ].join('\n')
    );

    const rendered = structuredTemplate.renderStructuredTemplate(template, {
      values: {
        [getField(template, 'checkbox', 'Finished').id]: true,
        [getField(template, 'number', 'Count').id]: '3',
        [getField(template, 'paragraph', 'Notes').id]: 'Line one\nLine two',
        [getField(template, 'text', 'Title').id]: 'Launch',
      },
    });

    expect(rendered.isValid).toBe(true);

    expect(rendered.text).toBe(
      ['Title: Launch', 'Line one\nLine two', 'Count: 3', 'Done: Yes'].join(
        '\n'
      )
    );
  });

  test('uses values as defaults', () => {
    const template = structuredTemplate.parseStructuredTemplate(
      '[text:Launch] [number:4] [paragraph:Notes]'
    );

    expect(structuredTemplate.renderStructuredTemplate(template).text).toBe(
      'Launch 4 Notes'
    );
  });

  test('renders unchecked checkboxes as no', () => {
    const template = structuredTemplate.parseStructuredTemplate(
      'Medication taken: [checkbox]'
    );

    expect(structuredTemplate.renderStructuredTemplate(template).text).toBe(
      'Medication taken: No'
    );
  });

  test('allows unvalidated values', () => {
    const template = structuredTemplate.parseStructuredTemplate(
      '[text:Name] [number:Count]'
    );

    const rendered = structuredTemplate.renderStructuredTemplate(template, {
      values: { [getField(template, 'number', 'Count').id]: 'NaN' },
    });

    expect(rendered.isValid).toBe(true);
    expect(rendered.text).toBe('Name NaN');
  });

  test('treats fields as optional', () => {
    const template =
      structuredTemplate.parseStructuredTemplate('[text?] [file?]');

    expect(template.fields.map((field) => field.type)).toEqual([
      'text',
      'file',
    ]);

    const rendered = structuredTemplate.renderStructuredTemplate(template);
    expect(rendered.hasContent).toBe(false);
  });

  test('strips attachments', () => {
    const template = structuredTemplate.parseStructuredTemplate(
      'Intro  \n[file:Upload]\n\n\n[recording:Voice]\n[link:Docs]\nOutro'
    );

    const rendered = structuredTemplate.renderStructuredTemplate(template, {
      attachments: {
        [getField(template, 'file', 'Upload').id]: true,
        [getField(template, 'link', 'Docs').id]: true,
        [getField(template, 'recording', 'Voice').id]: true,
      },
    });

    expect(rendered.isValid).toBe(true);
    expect(rendered.text).toBe('Intro\n\nOutro');
    expect(rendered.hasAttachments).toBe(true);
  });

  test('enforces max length', () => {
    const template = structuredTemplate.parseStructuredTemplate('[text:Long]');
    const field = getField(template, 'text', 'Long');

    const rendered = structuredTemplate.renderStructuredTemplate(template, {
      maxLength: 4,
      values: { [field.id]: '12345' },
    });

    expect(rendered.isValid).toBe(false);
    expect(rendered.textError).toContain('4');
  });
});

describe('formatStructuredTemplatePreview', () => {
  test('shows field labels', () => {
    expect(
      structuredTemplate.formatStructuredTemplatePreview(
        ['Title [text:Title]', '[file]', '[datetime:When]'].join('\n')
      )
    ).toBe('Title Title File [datetime:When]');
  });

  test('shows hidden text', () => {
    expect(
      structuredTemplate.formatStructuredTemplatePreview(
        'Mood [text]\n{{Rate 1-5 before bed}}'
      )
    ).toBe('Mood Text Rate 1-5 before bed');
  });

  test('drops markdown formatting', () => {
    expect(
      structuredTemplate.formatStructuredTemplatePreview(
        '**Mood:** [text:Good]'
      )
    ).toBe('Mood: Good');
  });

  test('keeps plain text', () => {
    expect(
      structuredTemplate.formatStructuredTemplatePreview('Daily note')
    ).toBe('Daily note');
  });
});

describe('structuredTemplateHasFields', () => {
  test('detects fields', () => {
    expect(structuredTemplate.structuredTemplateHasFields('Daily note')).toBe(
      false
    );

    expect(
      structuredTemplate.structuredTemplateHasFields('[file:Upload]')
    ).toBe(true);
  });
});
