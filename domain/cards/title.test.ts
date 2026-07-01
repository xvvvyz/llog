import * as cardTitle from '@/domain/cards/title';
import { describe, expect, test } from 'bun:test';

describe('normalizeCardTitle', () => {
  test('preserves apostrophes and casing', () => {
    expect(cardTitle.normalizeCardTitle("Cade's separation anxiety")).toBe(
      "Cade's separation anxiety"
    );
  });

  test('keeps smart apostrophes', () => {
    expect(cardTitle.normalizeCardTitle('Ada’s sleep, week 2')).toBe(
      'Ada’s sleep, week 2'
    );
  });

  test('strips wrapping quotes and heading markers', () => {
    expect(cardTitle.normalizeCardTitle('## "Weekly progress"')).toBe(
      'Weekly progress'
    );
  });

  test('collapses whitespace and trims', () => {
    expect(cardTitle.normalizeCardTitle('  Duration   and  distress ')).toBe(
      'Duration and distress'
    );
  });

  test('caps length at a word boundary', () => {
    expect(
      cardTitle.normalizeCardTitle(
        "Cade's separation anxiety progress over time",
        24
      )
    ).toBe("Cade's separation");
  });

  test('ignores non-string values', () => {
    expect(cardTitle.normalizeCardTitle(undefined)).toBeUndefined();
    expect(cardTitle.normalizeCardTitle('   ')).toBeUndefined();
  });
});

describe('fallbackCardTitle', () => {
  test('derives a title from the first prompt line, keeping apostrophes', () => {
    expect(
      cardTitle.fallbackCardTitle("How's Cade's anxiety?\nMore details")
    ).toBe("How's Cade's anxiety?");
  });

  test('caps to the given length', () => {
    expect(
      cardTitle.fallbackCardTitle('Duration and distress over time', 20)
    ).toBe('Duration and');
  });

  test('falls back when the prompt is empty', () => {
    expect(cardTitle.fallbackCardTitle('   ')).toBe('Progress card');
  });
});
