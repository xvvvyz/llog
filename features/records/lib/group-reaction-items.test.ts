import { groupReactionItems } from '@/features/records/lib/group-reaction-items';
import { describe, expect, test } from 'bun:test';

describe('groupReactionItems', () => {
  test('returns no groups for empty input and one group for short input', () => {
    expect(groupReactionItems([])).toEqual([]);
    expect(groupReactionItems(['a'])).toEqual([['a']]);
    expect(groupReactionItems(['a', 'b', 'c'])).toEqual([['a', 'b', 'c']]);
  });

  test('groups even-length lists into pairs', () => {
    expect(groupReactionItems([1, 2, 3, 4, 5, 6])).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  test('starts odd-length overflow with a group of three before pairing', () => {
    expect(groupReactionItems([1, 2, 3, 4, 5, 6, 7])).toEqual([
      [1, 2, 3],
      [4, 5],
      [6, 7],
    ]);
  });

  test('honors a leading group size before grouping the remaining items', () => {
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
