import { parseTemplateLabel } from '@/features/records/lib/template-label';
import { describe, expect, test } from 'bun:test';

describe('parseTemplateLabel', () => {
  test('reads labels across markdown formats', () => {
    expect(parseTemplateLabel('Notes: ')).toBe('Notes');
    expect(parseTemplateLabel('**Bold:** ')).toBe('Bold');
    expect(parseTemplateLabel('*Italic:* ')).toBe('Italic');
    expect(parseTemplateLabel('_Italic:_ ')).toBe('Italic');
    expect(parseTemplateLabel('~~Strike:~~ ')).toBe('Strike');
    expect(parseTemplateLabel('<u>Under:</u> ')).toBe('Under');
    expect(parseTemplateLabel('***Both:*** ')).toBe('Both');
    expect(parseTemplateLabel('**Patient** name: ')).toBe('Patient name');
    expect(parseTemplateLabel('full width：')).toBe('full width');
  });

  test('reads fully emphasized labels without a colon', () => {
    expect(parseTemplateLabel('**Duration (seconds)** ')).toBe(
      'Duration (seconds)'
    );

    expect(parseTemplateLabel('*Mood*')).toBe('Mood');
    expect(parseTemplateLabel('***Sleep***')).toBe('Sleep');
  });

  test('ignores non-label lines', () => {
    expect(parseTemplateLabel('just text')).toBeUndefined();
    expect(parseTemplateLabel('  ')).toBeUndefined();
    expect(parseTemplateLabel(':')).toBeUndefined();
    // partly bold body text is not a label
    expect(parseTemplateLabel('**important** note here')).toBeUndefined();
  });
});
