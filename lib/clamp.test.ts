import { clamp, clampIndex } from '@/lib/clamp';
import { describe, expect, test } from 'bun:test';

describe('clamp', () => {
  test('keeps values inside bounds and pins values outside bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(12, 0, 10)).toBe(10);
  });
});

describe('clampIndex', () => {
  test('normalizes arbitrary item indexes to a valid zero-based index', () => {
    expect(clampIndex(2.9, 5)).toBe(2);
    expect(clampIndex(-1, 5)).toBe(0);
    expect(clampIndex(99, 5)).toBe(4);
    expect(clampIndex(Number.NaN, 5)).toBe(0);
    expect(clampIndex(Number.POSITIVE_INFINITY, 5)).toBe(0);
    expect(clampIndex(3, 0)).toBe(0);
  });
});
