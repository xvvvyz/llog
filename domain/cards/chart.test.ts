import * as chart from '@/domain/cards/chart';
import { describe, expect, test } from 'bun:test';

const spec = {
  data: [
    { label: 'One', value: 1 },
    { label: 'Two', value: 3 },
  ],
};

describe('card charts', () => {
  test('renders line points', () => {
    expect(
      chart.getLineChartPoints({ chart: spec, height: 100, width: 100 })
    ).toMatchObject([
      { x: 0, y: expect.any(Number) },
      { x: 100, y: 0 },
    ]);
  });

  test('resolves chart series', () => {
    expect(
      chart.getChartSeries({
        series: [
          {
            data: [{ label: 'One', value: 1 }],
            label: 'Alone time',
            unit: 'min',
          },
          {
            data: [{ label: 'One', value: 8 }],
            label: 'Peak distress',
            unit: 'score',
          },
        ],
      })
    ).toMatchObject([
      { label: 'Alone time', unit: 'min' },
      { label: 'Peak distress', unit: 'score' },
    ]);

    expect(
      chart.getChartSeries({
        data: [{ label: 'One', value: 1 }],
        title: 'Best duration',
        unit: 'min',
      })
    ).toMatchObject([{ label: 'Best duration', unit: 'min' }]);
  });

  test('skips bar stacking', () => {
    const barChart = {
      data: [{ label: 'Baseline', value: 1 }],
      series: [
        {
          data: [{ label: 'One', value: 1 }],
          label: 'Alone time',
          unit: 'min',
        },
        {
          data: [{ label: 'One', value: 8 }],
          label: 'Peak distress',
          unit: 'score',
        },
      ],
      title: 'Sessions',
      type: 'bar' as const,
    };

    expect(chart.getRenderableChartSeries(barChart)).toMatchObject([
      { data: [{ label: 'Baseline', value: 1 }], label: 'Sessions' },
    ]);

    expect(
      chart.isRenderableChart({
        series: [
          {
            data: [{ label: 'One', value: 1 }],
            label: 'Alone time',
            unit: 'min',
          },
        ],
        type: 'bar' as const,
      })
    ).toBe(false);
  });

  test('detects mixed units', () => {
    expect(chart.hasMixedChartUnits([{ unit: 'min' }, { unit: 'score' }])).toBe(
      true
    );

    expect(chart.hasMixedChartUnits([{ unit: 'min' }, { unit: 'min' }])).toBe(
      false
    );

    expect(chart.hasMixedChartUnits([{}, {}])).toBe(true);
  });

  test('formats legend labels', () => {
    expect(
      chart.formatChartLegendLabel({ label: 'Alone time', unit: 'min' })
    ).toBe('Alone time (min)');

    expect(
      chart.formatChartLegendLabel({ label: 'Alone time (min)', unit: 'min' })
    ).toBe('Alone time (min)');

    expect(chart.formatChartLegendLabel({ label: 'Value', unit: 'min' })).toBe(
      'Value (min)'
    );

    expect(chart.formatChartLegendLabel({ label: 'min', unit: 'min' })).toBe(
      'Value (min)'
    );

    expect(chart.formatChartLegendLabel({ label: 'Peak distress' })).toBe(
      'Peak distress'
    );
  });

  test('scales line ranges', () => {
    expect(
      chart.getLineChartPoints({
        chart: {
          data: [
            { label: 'One', value: 50 },
            { label: 'Two', value: 60 },
          ],
        },
        height: 100,
        width: 100,
      })
    ).toMatchObject([
      { x: 0, y: 100 },
      { x: 100, y: 0 },
    ]);
  });

  test('pads domains', () => {
    expect(chart.padChartDomain({ max: 60, min: 50 })).toEqual({
      max: 60.8,
      min: 49.2,
    });

    expect(
      chart.padChartDomain({ max: 10, min: 0 }, 0.08, { clampMinAtZero: true })
    ).toEqual({ max: 10.8, min: 0 });
  });

  test('renders bars', () => {
    const bars = chart.getBarChartItems({
      chart: spec,
      gap: 10,
      height: 100,
      width: 110,
    });

    expect(bars).toHaveLength(2);
    expect(bars[0]).toMatchObject({ label: 'One', width: 44, x: 6 });
    expect(bars[0].y + bars[0].height).toBe(100);
  });

  test('uses supplied domain', () => {
    const bars = chart.getBarChartItems({
      chart: spec,
      domain: { max: 4, min: 0 },
      height: 100,
      width: 110,
    });

    expect(bars[1].y).toBe(25);
  });

  test('renders flush bars', () => {
    const bars = chart.getBarChartItems({
      chart: spec,
      edgeGap: 0,
      gap: 10,
      height: 100,
      width: 110,
    });

    const last = bars.at(-1);
    expect(bars[0]).toMatchObject({ x: 0, width: 50 });
    expect(last ? last.x + last.width : 0).toBe(110);
  });

  test('caps bars', () => {
    const bars = chart.getBarChartItems({
      chart: spec,
      gap: 10,
      height: 100,
      maxBarWidth: 20,
      width: 110,
    });

    expect(bars[0]).toMatchObject({ width: 20, x: 18 });
    expect(bars[1]).toMatchObject({ width: 20, x: 72 });
  });

  test('caps sparse bar gaps', () => {
    const bars = chart.getBarChartItems({
      chart: {
        data: [
          { label: 'One', value: 1 },
          { label: 'Two', value: 3 },
          { label: 'Three', value: 2 },
        ],
      },
      height: 100,
      maxBarWidth: 20,
      maxBarGap: 10,
      width: 180,
    });

    expect(bars.map((bar) => bar.width)).toEqual([20, 20, 20]);
    expect(bars[1].x - (bars[0].x + bars[0].width)).toBe(10);
    expect(bars[2].x - (bars[1].x + bars[1].width)).toBe(10);
    expect(bars[0].x).toBe(50);
  });

  test('widens capped bar groups', () => {
    const bars = chart.getBarChartItems({
      chart: spec,
      height: 100,
      maxBarGap: 100,
      maxBarWidth: 20,
      width: 200,
    });

    expect(bars[0]).toMatchObject({ width: 20, x: 30 });
    expect(bars[1]).toMatchObject({ width: 20, x: 150 });
    expect(bars[1].x - (bars[0].x + bars[0].width)).toBe(100);
  });

  test('fits dense bars', () => {
    const bars = chart.getBarChartItems({
      chart: {
        data: Array.from({ length: 60 }, (_, index) => ({
          label: String(index),
          value: index,
        })),
      },
      height: 100,
      width: 120,
    });

    const last = bars.at(-1);
    expect(bars).toHaveLength(60);
    expect(last ? last.x + last.width : 0).toBeLessThanOrEqual(120);
  });

  test('builds ticks', () => {
    expect(chart.getChartTicks({ count: 5, max: 10, min: 0 })).toEqual([
      10, 7.5, 5, 2.5, 0,
    ]);
  });

  test('formats axis values', () => {
    expect(chart.formatChartAxisValue({ decimals: 0, value: 7.5 })).toBe('8');
    expect(chart.formatChartAxisValue({ decimals: 1, value: 7.5 })).toBe('7.5');
    expect(chart.formatChartAxisValue({ decimals: 2, value: 7 })).toBe('7');

    expect(chart.formatChartAxisValue({ decimals: 1, value: 1500 })).toBe(
      '1.5k'
    );

    expect(chart.formatChartAxisValue({ value: 1500 })).toBe('1.5k');
  });

  test('formats date ticks', () => {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    expect(chart.formatChartTickLabel(`${currentYear}-05-19`)).toBe('5/19');

    expect(
      chart.formatChartTickLabel(`${currentYear}-05-19T15:30:00.000Z`)
    ).toBe('5/19');

    expect(chart.formatChartTickLabel(`${previousYear}-12-31`)).toBe(
      `12/31/${String(previousYear).slice(-2)}`
    );
  });

  test('keeps text ticks', () => {
    expect(chart.formatChartTickLabel('Baseline')).toBe('Baseline');

    expect(chart.formatChartTickLabel('Very long checkpoint')).toBe(
      'Very lo...'
    );
  });
});
