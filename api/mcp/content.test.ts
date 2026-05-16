import { hasLinkedContent, recordIdFromUrl } from '@/api/mcp/content';
import { describe, expect, test } from 'bun:test';

describe('recordIdFromUrl', () => {
  test('extracts ids', () => {
    expect(recordIdFromUrl('https://llog.example/records/record-1')).toBe(
      'record-1'
    );

    expect(recordIdFromUrl('https://llog.example/records/record%201')).toBe(
      'record 1'
    );
  });

  test('rejects invalid URLs', () => {
    expect(recordIdFromUrl('https://llog.example/logs/log-1')).toBeUndefined();
    expect(recordIdFromUrl('not a url')).toBeUndefined();
  });
});

describe('hasLinkedContent', () => {
  test('matches content', () => {
    expect(hasLinkedContent({ text: ' note ' })).toBe(true);
    expect(hasLinkedContent({ links: [{}] })).toBe(true);
    expect(hasLinkedContent({ files: [{}] })).toBe(true);
  });

  test('rejects empty content', () => {
    expect(hasLinkedContent({ links: [], text: '  ' })).toBe(false);
  });
});
