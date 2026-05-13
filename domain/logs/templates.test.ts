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

describe('resolveCopyTemplateTagsForTargetLog', () => {
  const sourceTags = [
    { color: 2, name: 'Foo' },
    { color: 4, name: 'Bar' },
    { color: 5, name: ' foo ' },
  ];

  test('links matching tags', () => {
    expect(
      templates.resolveCopyTemplateTagsForTargetLog({
        sourceTags,
        targetTags: [{ id: 'target-foo', name: 'foo' }],
      })
    ).toEqual({ linkedTagIds: ['target-foo'], missingTags: [] });
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
        targetTags: [{ id: 'target-foo', name: 'foo' }],
      })
    ).toEqual({
      linkedTagIds: ['target-foo'],
      missingTags: [{ color: 4, name: 'Bar' }],
    });
  });
});

describe('filterTemplatesByQuery', () => {
  const items = [
    { tags: [{ name: 'Foo' }], text: 'Lorem ipsum' },
    { tags: [{ name: 'Bar' }], text: 'Foo bar' },
  ];

  test('matches templates', () => {
    expect(templates.filterTemplatesByQuery(items, 'LOREM')).toEqual([
      items[0],
    ]);

    expect(templates.filterTemplatesByQuery(items, 'bar')).toEqual([items[1]]);
  });

  test('keeps blank queries', () => {
    expect(templates.filterTemplatesByQuery(items, '   ')).toBe(items);
  });
});
