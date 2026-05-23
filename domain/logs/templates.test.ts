import * as templates from '@/domain/logs/templates';
import { describe, expect, test } from 'bun:test';

describe('getNextTemplateOrder', () => {
  test('increments max order', () => {
    expect(
      templates.getNextTemplateOrder([
        { order: 2 },
        { order: null },
        { order: 5 },
      ])
    ).toBe(6);
  });

  test('starts at zero', () => {
    expect(templates.getNextTemplateOrder([])).toBe(0);
  });
});

describe('getTemplateTagChanges', () => {
  test('diffs tag ids', () => {
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

describe('copy template tags', () => {
  const sourceTags = [
    { color: 2, name: 'Ideas' },
    { color: 4, name: 'Reading' },
    { color: 5, name: ' ideas ' },
  ];

  test('links matching tags', () => {
    expect(
      templates.resolveCopyTemplateTagsForTargetLog({
        sourceTags,
        targetTags: [{ id: 'target-ideas', name: 'ideas' }],
      })
    ).toEqual({ linkedTagIds: ['target-ideas'], missingTags: [] });
  });

  test('skips missing tags', () => {
    expect(
      templates.resolveCopyTemplateTagsForTargetLog({
        sourceTags,
        targetTags: [],
      })
    ).toEqual({ linkedTagIds: [], missingTags: [] });
  });

  test('creates missing tags', () => {
    expect(
      templates.resolveCopyTemplateTagsForTargetLog({
        createMissingTags: true,
        sourceTags,
        targetTags: [{ id: 'target-ideas', name: 'ideas' }],
      })
    ).toEqual({
      linkedTagIds: ['target-ideas'],
      missingTags: [{ color: 4, name: 'Reading' }],
    });
  });
});

describe('filterTemplatesByQuery', () => {
  const items = [
    { tags: [{ name: 'Ideas' }], text: 'Morning pages' },
    { tags: [{ name: 'Reading' }], text: 'Book notes' },
  ];

  test('matches templates', () => {
    expect(templates.filterTemplatesByQuery(items, 'MORNING')).toEqual([
      items[0],
    ]);

    expect(templates.filterTemplatesByQuery(items, 'book')).toEqual([items[1]]);
  });

  test('keeps blank queries', () => {
    expect(templates.filterTemplatesByQuery(items, '   ')).toBe(items);
  });
});
