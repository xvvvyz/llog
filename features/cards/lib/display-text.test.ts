import * as displayText from '@/features/cards/lib/display-text';
import { describe, expect, test } from 'bun:test';

describe('display text', () => {
  test('formats operators', () => {
    expect(
      displayText.formatComparisonOperators(
        'distress <=2, days >=3, events !=0'
      )
    ).toBe('distress ≤2, days ≥3, events ≠0');
  });
});
