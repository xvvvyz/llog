import { format, isThisYear, isValid } from 'date-fns';
import type * as output from '@/domain/cards/output';

export type ChartPoint = { x: number; y: number };

export type BarChartItem = ChartPoint & {
  height: number;
  label: string;
  value: number;
  width: number;
};

export type ResolvedChartSeries = output.CardChartSeries;

export type ChartDomain = { max: number; min: number };

const finiteData = (data?: output.CardChartDatum[]) =>
  (data ?? []).filter((item) => Number.isFinite(item.value));

const trimFormattedNumber = (value: string) =>
  value.replace(/(\.\d*?)0+$/g, '$1').replace(/\.$/, '');

const stripTrailingParenthetical = (value: string) =>
  value.replace(/\s*\([^)]*\)\s*$/g, '').trim() || value.trim();

export const formatChartLegendLabel = ({
  label,
  unit,
}: {
  label: string;
  unit?: string;
}) => {
  const trimmedLabel = label.trim();
  const trimmedUnit = unit?.trim();
  if (!trimmedUnit) return trimmedLabel;
  const baseLabel = stripTrailingParenthetical(trimmedLabel);

  if (baseLabel.toLowerCase() === trimmedUnit.toLowerCase()) {
    return `Value (${trimmedUnit})`;
  }

  return `${baseLabel} (${trimmedUnit})`;
};

export const getChartSeries = (
  chart: Pick<output.CardChart, 'data' | 'series' | 'title' | 'unit'>
): ResolvedChartSeries[] => {
  const series = (chart.series ?? [])
    .map((item) => ({
      ...item,
      data: finiteData(item.data),
      label: stripTrailingParenthetical(item.label),
    }))
    .filter((item) => item.data.length);

  if (series.length) return series;
  const data = finiteData(chart.data);
  if (!data.length) return [];

  return [
    {
      data,
      label: chart.title?.trim() || (chart.unit ? chart.unit : 'Value'),
      ...(chart.unit && { unit: chart.unit }),
    },
  ];
};

export const getPrimaryChartData = (
  chart: Pick<output.CardChart, 'data' | 'series' | 'title' | 'unit'>
) => getChartSeries(chart)[0]?.data ?? [];

export const getRenderableChartSeries = (
  chart: Pick<output.CardChart, 'data' | 'series' | 'title' | 'type' | 'unit'>
) => {
  if (chart.type !== 'bar') return getChartSeries(chart);

  return getChartSeries({
    data: chart.data,
    title: chart.title,
    unit: chart.unit,
  });
};

export const isRenderableChart = (
  chart?: Pick<
    output.CardChart,
    'data' | 'series' | 'title' | 'type' | 'unit'
  > | null
) => !!chart && getRenderableChartSeries(chart).length > 0;

export const getChartValues = (series: Pick<ResolvedChartSeries, 'data'>[]) =>
  series.flatMap((item) => item.data.map((datum) => datum.value));

export const hasMixedChartUnits = (
  series: Pick<ResolvedChartSeries, 'unit'>[]
) => {
  if (series.length <= 1) return false;
  const units = series.map((item) => item.unit?.trim() ?? '');
  const firstUnit = units[0];
  return !firstUnit || units.some((unit) => unit !== firstUnit);
};

export const hasNonNegativeValues = (values: number[]) => {
  const finiteValues = values.filter(Number.isFinite);
  return finiteValues.length > 0 && finiteValues.every((value) => value >= 0);
};

export const getChartDomain = (values: number[]): ChartDomain => {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return { max: 1, min: 0 };
  const rawMin = Math.min(...finiteValues);
  const rawMax = Math.max(...finiteValues);
  const min = Math.min(0, rawMin);
  const max = Math.max(1, rawMax);
  if (min === max) return { max: max + 1, min: min - 1 };
  return { max, min };
};

export const getLineChartDomain = (values: number[]): ChartDomain => {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return { max: 1, min: 0 };
  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  if (min === max) return { max: max + 1, min: min - 1 };
  return { max, min };
};

export const padChartDomain = (
  domain: ChartDomain,
  paddingRatio = 0.08,
  options: { clampMinAtZero?: boolean } = {}
): ChartDomain => {
  const span = domain.max - domain.min || 1;
  const padding = span * Math.max(0, paddingRatio);
  const min = domain.min - padding;

  return {
    max: domain.max + padding,
    min: options.clampMinAtZero ? Math.max(0, min) : min,
  };
};

export const scaleChartValue = ({
  height,
  max,
  min,
  value,
}: {
  height: number;
  max: number;
  min: number;
  value: number;
}) => {
  const span = max - min || 1;
  return height - ((value - min) / span) * height;
};

export const getChartTicks = ({
  count = 5,
  max,
  min,
}: {
  count?: number;
  max: number;
  min: number;
}) => {
  if (count <= 1) return [max];
  const span = max - min || 1;

  return Array.from(
    { length: count },
    (_, index) => max - (span * index) / (count - 1)
  );
};

export const formatChartAxisValue = ({
  decimals,
  value,
}: {
  decimals?: number;
  value: number;
}) => {
  const abs = Math.abs(value);

  const resolvedDecimals =
    decimals ?? (abs >= 1000 ? 1 : Number.isInteger(value) ? 0 : 1);

  if (abs >= 1000) {
    return `${trimFormattedNumber(
      (value / 1000).toFixed(Math.min(resolvedDecimals, 1))
    )}k`;
  }

  return trimFormattedNumber(value.toFixed(resolvedDecimals));
};

export const getLineChartPoints = ({
  chart,
  domain,
  height,
  width,
}: {
  chart: Pick<output.CardChart, 'data' | 'series' | 'unit'>;
  domain?: { max: number; min: number };
  height: number;
  width: number;
}): ChartPoint[] => {
  const data = getPrimaryChartData(chart);
  if (!data.length) return [];

  const { max, min } =
    domain ?? getLineChartDomain(data.map((item) => item.value));

  const step = data.length > 1 ? width / (data.length - 1) : 0;

  return data.map((item, index) => ({
    x: data.length > 1 ? index * step : width / 2,
    y: scaleChartValue({ height, max, min, value: item.value }),
  }));
};

export const getBarChartItems = ({
  axisGap = 0,
  domain,
  edgeGap = 6,
  chart,
  gap = 8,
  height,
  maxBarGap,
  maxBarWidth,
  width,
}: {
  axisGap?: number;
  chart: Pick<output.CardChart, 'data' | 'series' | 'unit'>;
  domain?: ChartDomain;
  edgeGap?: number;
  gap?: number;
  height: number;
  maxBarGap?: number;
  maxBarWidth?: number;
  width: number;
}): BarChartItem[] => {
  const data = getPrimaryChartData(chart);
  if (!data.length) return [];
  const { max, min } = domain ?? getChartDomain(data.map((item) => item.value));

  const resolvedEdgeGap = Math.min(
    Math.max(0, edgeGap),
    Math.max(0, (width - data.length) / 2)
  );

  const availableWidth = Math.max(1, width - resolvedEdgeGap * 2);
  const totalRequestedGap = gap * (data.length - 1);
  const maxTotalGap = Math.max(0, availableWidth - data.length);
  const totalGap = Math.min(totalRequestedGap, maxTotalGap);
  const resolvedGap = data.length > 1 ? totalGap / (data.length - 1) : 0;
  const rawBarWidth = Math.max(1, (availableWidth - totalGap) / data.length);

  const resolvedMaxBarWidth =
    maxBarWidth == null ? undefined : Math.max(1, maxBarWidth);

  const barWidth =
    resolvedMaxBarWidth == null
      ? rawBarWidth
      : Math.min(rawBarWidth, resolvedMaxBarWidth);

  const rawBarGap = rawBarWidth + resolvedGap - barWidth;

  const resolvedMaxBarGap =
    maxBarGap == null
      ? undefined
      : Math.max(resolvedGap, Math.max(0, maxBarGap));

  const fillBarGap =
    data.length > 1
      ? Math.max(
          0,
          (availableWidth - data.length * barWidth) / (data.length - 1)
        )
      : rawBarGap;

  const barGap =
    resolvedMaxBarGap == null
      ? rawBarGap
      : Math.min(fillBarGap, resolvedMaxBarGap);

  const groupWidth =
    data.length * barWidth + Math.max(0, data.length - 1) * barGap;

  const groupOffset = Math.max(0, (availableWidth - groupWidth) / 2);
  const baselineY = scaleChartValue({ height, max, min, value: 0 });
  const resolvedAxisGap = Math.min(Math.max(0, axisGap), Math.max(0, height));

  return data.map((item, index) => {
    const y = scaleChartValue({ height, max, min, value: item.value });
    let top = Math.min(y, baselineY);
    let bottom = Math.max(y, baselineY);

    if (item.value > 0) {
      bottom = Math.max(top + 1, bottom - resolvedAxisGap);
    } else if (item.value < 0) {
      top = Math.min(bottom - 1, top + resolvedAxisGap);
    } else {
      top = Math.max(0, baselineY - resolvedAxisGap - 1);
      bottom = top + 1;
    }

    return {
      height: Math.max(1, bottom - top),
      label: item.label,
      value: item.value,
      width: barWidth,
      x: resolvedEdgeGap + groupOffset + index * (barWidth + barGap),
      y: top,
    };
  });
};

export const parseChartLabelDate = (label: string) => {
  const trimmed = label.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
      ? date
      : undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}[T\s]/.test(trimmed)) return undefined;
  const date = new Date(trimmed);
  return isValid(date) ? date : undefined;
};

export const hasChartLabelTime = (label: string) =>
  /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(label.trim());

export const formatChartTickLabel = (
  label: string,
  { maxLength = 10 }: { maxLength?: number } = {}
) => {
  const date = parseChartLabelDate(label);
  if (date) return format(date, isThisYear(date) ? 'M/d' : 'M/d/yy');
  const trimmed = label.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(1, maxLength - 3))}...`;
};
