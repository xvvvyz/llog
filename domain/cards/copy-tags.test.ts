import * as copyTags from '@/domain/cards/copy-tags';
import { describe, expect, test } from 'bun:test';

describe('copy card tags', () => {
  const sourceTags = [
    { color: 2, name: 'Ideas' },
    { color: 4, name: 'Reading' },
    { color: 5, name: ' ideas ' },
  ];

  test('links matching tags', () => {
    expect(
      copyTags.resolveCopyCardTagsForTargetLog({
        sourceTags,
        targetTags: [{ id: 'target-ideas', name: 'ideas' }],
      })
    ).toEqual({
      linkedTagIds: ['target-ideas'],
      missingTags: [{ color: 4, name: 'Reading' }],
    });
  });

  test('copies missing tags', () => {
    expect(
      copyTags.resolveCopyCardTagsForTargetLog({ sourceTags, targetTags: [] })
    ).toEqual({
      linkedTagIds: [],
      missingTags: [
        { color: 2, name: 'Ideas' },
        { color: 4, name: 'Reading' },
      ],
    });
  });
});
