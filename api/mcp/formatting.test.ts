import { parseRecordMarkdown } from '@/domain/records/markdown';
import { describe, expect, test } from 'bun:test';
import * as formatting from '@/api/mcp/formatting';
import * as structuredTemplate from '@/features/logs/lib/structured-template';

describe('mcp formatting docs', () => {
  test('documents real template inputs', () => {
    for (const type of structuredTemplate.STRUCTURED_TEMPLATE_FIELD_TYPES) {
      expect(formatting.TEMPLATE_INPUTS_FORMATTING).toContain(`[${type}]`);

      const { fields } = structuredTemplate.parseStructuredTemplate(
        `[${type}]`
      );

      expect(fields[0]?.type).toBe(type);
    }
  });

  test('documents real markdown', () => {
    expect(formatting.MARKDOWN_FORMATTING).toContain('**bold**');

    expect(parseRecordMarkdown('**bold**')[0]).toMatchObject({
      children: [{ kind: 'bold' }],
    });
  });

  test('does not document unsupported headings', () => {
    expect(parseRecordMarkdown('# Title')[0]).toMatchObject({
      children: [{ kind: 'text', text: '# Title' }],
      kind: 'paragraph',
    });
  });
});
