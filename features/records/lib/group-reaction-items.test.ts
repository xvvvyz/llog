import { groupReactionItems } from '@/features/records/lib/group-reaction-items';
import { describe, expect, test } from 'bun:test';

describe('groupReactionItems', () => {
  test('handles short lists', () => {
    expect(groupReactionItems([])).toEqual([]);
    expect(groupReactionItems(['a'])).toEqual([['a']]);
    expect(groupReactionItems(['a', 'b', 'c'])).toEqual([['a', 'b', 'c']]);
  });

  test('groups pairs', () => {
    expect(groupReactionItems([1, 2, 3, 4, 5, 6])).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  test('groups odd overflow', () => {
    expect(groupReactionItems([1, 2, 3, 4, 5, 6, 7])).toEqual([
      [1, 2, 3],
      [4, 5],
      [6, 7],
    ]);
  });

  test('honors leading size', () => {
    expect(
      groupReactionItems([1, 2, 3, 4, 5], { leadingGroupSize: 1 })
    ).toEqual([[1], [2, 3], [4, 5]]);

    expect(
      groupReactionItems([1, 2, 3, 4, 5], { leadingGroupSize: 5 })
    ).toEqual([
      [1, 2, 3],
      [4, 5],
    ]);
  });
});
