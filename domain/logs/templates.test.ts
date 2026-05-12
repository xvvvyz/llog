import * as templates from '@/domain/logs/templates';
import { describe, expect, test } from 'bun:test';

describe('getNextTemplateOrder', () => {
  test('returns one more than the largest existing order', () => {
    expect(
      templates.getNextTemplateOrder([
        { order: 2 },
        { order: null },
        { order: 5 },
      ])
    ).toBe(6);
  });

  test('starts at zero for an empty list', () => {
    expect(templates.getNextTemplateOrder([])).toBe(0);
  });
});

describe('getTemplateTagChanges', () => {
  test('deduplicates incoming tag ids and returns link/unlink sets', () => {
    expect(
      templates.getTemplateTagChanges({
        currentTagIds: ['a', 'b'],
        nextTagIds: ['b', 'c', 'c'],
      })
    ).toEqual({
      linkTagIds: ['c'],
      nextTagIds: ['b', 'c'],
      unlinkTagIds: ['a'],
    });
  });
});

describe('resolveCopyTemplateTagsForTargetLog', () => {
  const sourceTags = [
    { color: 2, name: 'Focus' },
    { color: 4, name: 'Reading' },
    { color: 5, name: ' focus ' },
  ];

  test('links matching target tags by normalized name', () => {
    expect(
      templates.resolveCopyTemplateTagsForTargetLog({
        sourceTags,
        targetTags: [{ id: 'target-focus', name: 'focus' }],
      })
    ).toEqual({ linkedTagIds: ['target-focus'], missingTags: [] });
  });

  test('skips missing source tags when creation is disabled', () => {
    expect(
      templates.resolveCopyTemplateTagsForTargetLog({
        sourceTags,
        targetTags: [],
      })
    ).toEqual({ linkedTagIds: [], missingTags: [] });
  });

  test('returns missing source tags when creation is enabled', () => {
    expect(
      templates.resolveCopyTemplateTagsForTargetLog({
        createMissingTags: true,
        sourceTags,
        targetTags: [{ id: 'target-focus', name: 'focus' }],
      })
    ).toEqual({
      linkedTagIds: ['target-focus'],
      missingTags: [{ color: 4, name: 'Reading' }],
    });
  });
});

describe('filterTemplatesByQuery', () => {
  const items = [
    { tags: [{ name: 'Focus' }], text: 'Morning plan' },
    { tags: [{ name: 'Reading' }], text: 'Book notes' },
  ];

  test('matches template text and tag names case-insensitively', () => {
    expect(templates.filterTemplatesByQuery(items, 'MORNING')).toEqual([
      items[0],
    ]);

    expect(templates.filterTemplatesByQuery(items, 'read')).toEqual([items[1]]);
  });

  test('returns the original list for blank queries', () => {
    expect(templates.filterTemplatesByQuery(items, '   ')).toBe(items);
  });
});
