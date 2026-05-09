import * as carousel from '@/features/files/lib/carousel';
import type { FileItem } from '@/features/files/types/file';
import { describe, expect, test } from 'bun:test';

const files = ['file-a', 'file-b', 'file-c'].map((id) => ({ id }) as FileItem);

describe('pruneStateMap', () => {
  test('returns the same object when every entry is still allowed', () => {
    const state = { 'file-a': true, 'file-b': false };

    expect(
      carousel.pruneStateMap(state, new Set(['file-a', 'file-b', 'file-c']))
    ).toBe(state);
  });

  test('drops state for files that are no longer present', () => {
    expect(
      carousel.pruneStateMap(
        { 'file-a': true, 'file-b': false, stale: true },
        new Set(['file-a', 'file-b'])
      )
    ).toEqual({ 'file-a': true, 'file-b': false });
  });
});

describe('getDominantCarouselIndex', () => {
  test('clamps progress and switches indexes after the halfway point', () => {
    expect(carousel.getDominantCarouselIndex(-1, 3)).toBe(0);
    expect(carousel.getDominantCarouselIndex(0.5, 3)).toBe(0);
    expect(carousel.getDominantCarouselIndex(0.51, 3)).toBe(1);
    expect(carousel.getDominantCarouselIndex(99, 3)).toBe(2);
    expect(carousel.getDominantCarouselIndex(1, 0)).toBe(0);
  });
});

describe('getVisibleCarouselMediaIds', () => {
  test('returns the floor and ceiling media ids for the current progress', () => {
    expect([...carousel.getVisibleCarouselMediaIds(files, 0.25)]).toEqual([
      'file-a',
      'file-b',
    ]);

    expect([...carousel.getVisibleCarouselMediaIds(files, 2)]).toEqual([
      'file-c',
    ]);
  });

  test('clamps progress outside the available media range', () => {
    expect([...carousel.getVisibleCarouselMediaIds(files, -10)]).toEqual([
      'file-a',
    ]);

    expect([...carousel.getVisibleCarouselMediaIds(files, 10)]).toEqual([
      'file-c',
    ]);

    expect([...carousel.getVisibleCarouselMediaIds([], 1)]).toEqual([]);
  });
});
