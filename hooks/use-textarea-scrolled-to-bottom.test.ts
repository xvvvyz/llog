import { getNextScrolledToBottom } from '@/hooks/use-textarea-scrolled-to-bottom';
import { describe, expect, test } from 'bun:test';

describe('getNextScrolledToBottom', () => {
  test('shows when content fits', () => {
    expect(
      getNextScrolledToBottom({
        current: false,
        metrics: { contentHeight: 80, viewportHeight: 200 },
        text: 'short note',
      })
    ).toBe(true);
  });

  test('keeps overflow hidden at the top', () => {
    expect(
      getNextScrolledToBottom({
        current: false,
        metrics: { contentHeight: 600, offsetY: 0, viewportHeight: 200 },
        text: 'long note',
      })
    ).toBe(false);
  });

  test('shows when scrolled to bottom', () => {
    expect(
      getNextScrolledToBottom({
        current: false,
        metrics: { contentHeight: 600, offsetY: 400, viewportHeight: 200 },
        text: 'long note',
      })
    ).toBe(true);
  });

  test('hides after scrolling up off the bottom', () => {
    expect(
      getNextScrolledToBottom({
        current: true,
        metrics: { contentHeight: 600, offsetY: 250, viewportHeight: 200 },
        previousOffsetY: 400,
        text: 'long note',
      })
    ).toBe(false);
  });

  test('stays shown while rubber-banding at the bottom', () => {
    expect(
      getNextScrolledToBottom({
        current: true,
        metrics: { contentHeight: 600, offsetY: 398, viewportHeight: 200 },
        previousOffsetY: 405,
        text: 'long note',
      })
    ).toBe(true);
  });

  test('bounds viewport by maxViewportHeight', () => {
    expect(
      getNextScrolledToBottom({
        current: false,
        maxViewportHeight: 200,
        metrics: { contentHeight: 600, offsetY: 400 },
        text: 'long note',
      })
    ).toBe(true);
  });

  test('shows empty content', () => {
    expect(
      getNextScrolledToBottom({ current: false, metrics: {}, text: '' })
    ).toBe(true);
  });
});
