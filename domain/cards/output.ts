import { parseIsoDateTime } from '@/lib/iso-date-time';
import { z } from 'zod/v4';

export const MAX_CARD_CHART_POINTS = 60;

export const MAX_CARD_CHART_SERIES = 4;

export const MAX_CARD_METRICS = 6;

export const MAX_CARD_MILESTONES = 8;

export const MAX_CARD_GENERATED_TITLE_LENGTH = 36;

export const MAX_CARD_GENERATED_SUMMARY_LENGTH = 320;

export const MAX_CARD_SUMMARY_LENGTH = 1200;

export const MAX_CARD_METRIC_LABEL_LENGTH = 40;

export const MAX_CARD_METRIC_VALUE_LENGTH = 40;

export const MAX_CARD_UNIT_LENGTH = 16;

export const MAX_CARD_EXACT_METRIC_OVERRIDE_KEY_LENGTH = 120;

export const MAX_CARD_MILESTONE_DATE_LENGTH = 32;

export const MAX_CARD_MILESTONE_DETAIL_LENGTH = 240;

export const MAX_CARD_MILESTONE_TITLE_LENGTH = 80;

export const MAX_CARD_CHART_DATUM_LABEL_LENGTH = 32;

export const MAX_CARD_CHART_SERIES_LABEL_LENGTH = 40;

export const MAX_CARD_CHART_TITLE_LENGTH = 80;

export const CARD_METRIC_VALUE_FORMATS = [
  'date',
  'datetime',
  'durationSince',
] as const;

export type CardMetricValueFormat = (typeof CARD_METRIC_VALUE_FORMATS)[number];

export const cardMetricSchema = z
  .object({
    label: z.string().min(1).max(MAX_CARD_METRIC_LABEL_LENGTH),
    trend: z.enum(['down', 'flat', 'up']).optional(),
    unit: z.string().max(MAX_CARD_UNIT_LENGTH).optional(),
    value: z.union([z.string().max(MAX_CARD_METRIC_VALUE_LENGTH), z.number()]),
    valueFormat: z.enum(CARD_METRIC_VALUE_FORMATS).optional(),
  })
  .strict()
  .refine(
    (metric) =>
      !metric.valueFormat ||
      (typeof metric.value === 'string' && !!parseIsoDateTime(metric.value)),
    {
      message: 'Formatted metrics require an ISO timestamp string value',
      path: ['value'],
    }
  );

export const cardMilestoneSchema = z
  .object({
    date: z.string().max(MAX_CARD_MILESTONE_DATE_LENGTH).optional(),
    detail: z.string().max(MAX_CARD_MILESTONE_DETAIL_LENGTH).optional(),
    title: z.string().min(1).max(MAX_CARD_MILESTONE_TITLE_LENGTH),
  })
  .strict();

export const cardChartDatumSchema = z
  .object({
    label: z.string().min(1).max(MAX_CARD_CHART_DATUM_LABEL_LENGTH),
    value: z.number(),
  })
  .strict();

export const cardChartSeriesSchema = z
  .object({
    data: z.array(cardChartDatumSchema).min(1).max(MAX_CARD_CHART_POINTS),
    label: z.string().min(1).max(MAX_CARD_CHART_SERIES_LABEL_LENGTH),
    unit: z.string().max(MAX_CARD_UNIT_LENGTH).optional(),
  })
  .strict();

export const cardChartXAxisSchema = z
  .object({ labelMode: z.enum(['all', 'auto', 'sparse']).optional() })
  .strict();

export const cardChartYAxisSchema = z
  .object({
    decimals: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
    tickCount: z
      .union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)])
      .optional(),
  })
  .strict();

export const cardChartSchema = z
  .object({
    data: z
      .array(cardChartDatumSchema)
      .min(1)
      .max(MAX_CARD_CHART_POINTS)
      .optional(),
    series: z
      .array(cardChartSeriesSchema)
      .min(1)
      .max(MAX_CARD_CHART_SERIES)
      .optional(),
    title: z.string().max(MAX_CARD_CHART_TITLE_LENGTH).optional(),
    type: z.enum(['bar', 'line']),
    unit: z.string().max(MAX_CARD_UNIT_LENGTH).optional(),
    xAxis: cardChartXAxisSchema.optional(),
    yAxis: cardChartYAxisSchema.optional(),
  })
  .strict()
  .refine((chart) => !!chart.data?.length || !!chart.series?.length, {
    message: 'Chart requires data or series',
  })
  .refine((chart) => chart.type !== 'bar' || !chart.series?.length, {
    message: 'Bar charts use data, not series',
  });

export const cardOutputSchema = z
  .object({
    chart: cardChartSchema.optional(),
    exactMetricLabelOverrides: z
      .record(
        z.string().min(1).max(MAX_CARD_EXACT_METRIC_OVERRIDE_KEY_LENGTH),
        z.string().min(1).max(MAX_CARD_METRIC_LABEL_LENGTH)
      )
      .optional(),
    metrics: z.array(cardMetricSchema).max(MAX_CARD_METRICS).default([]),
    milestones: z
      .array(cardMilestoneSchema)
      .max(MAX_CARD_MILESTONES)
      .default([]),
    summary: z.string().min(1).max(MAX_CARD_SUMMARY_LENGTH).optional(),
  })
  .strict()
  .refine(
    (output) =>
      !!output.chart ||
      output.metrics.length > 0 ||
      output.milestones.length > 0 ||
      !!output.summary?.trim(),
    { message: 'Card output requires content' }
  );

export type CardOutput = z.infer<typeof cardOutputSchema>;

export type CardChart = z.infer<typeof cardChartSchema>;

export type CardChartDatum = z.infer<typeof cardChartDatumSchema>;

export type CardChartSeries = z.infer<typeof cardChartSeriesSchema>;

type CardMetricTrend = NonNullable<CardOutput['metrics'][number]['trend']>;

export const validateCardOutput = (value: unknown) =>
  cardOutputSchema.safeParse(value);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const readString = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  return text.slice(0, maxLength);
};

const readUnit = (value: unknown) =>
  readString(value, 16)
    ?.replace(/[()[\]{}"'“”‘’`.,!?;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const getDisplayLabelText = (value: unknown, defaultValue?: string) => {
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    if (text) return text;
  }

  return defaultValue?.trim();
};

const DANGLING_LABEL_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

const stripDanglingLabelWords = (value: string) => {
  const words = value.split(' ').filter(Boolean);

  while (
    words.length > 1 &&
    DANGLING_LABEL_WORDS.has(words.at(-1)?.toLowerCase() ?? '')
  ) {
    words.pop();
  }

  return words.join(' ');
};

export const normalizeCardDisplayLabel = ({
  defaultValue,
  maxLength,
  maxWords = 6,
  value,
}: {
  defaultValue?: string;
  maxLength: number;
  maxWords?: number;
  value: unknown;
}) => {
  const text = getDisplayLabelText(value, defaultValue);
  if (!text) return undefined;

  const normalized = text
    .replace(/^#+\s*/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/&/g, ' and ')
    .replace(/%/g, ' percent ')
    .replace(/[()[\]{}"'“”‘’`]/g, ' ')
    .replace(/[.,!?;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const words = normalized.split(' ').filter(Boolean).slice(0, maxWords);
  let label = '';

  for (const word of words) {
    const nextLabel = label ? `${label} ${word}` : word;
    if (nextLabel.length > maxLength) break;
    label = nextLabel;
  }

  if (!label && words[0]) label = words[0].slice(0, maxLength);
  if (!label) return undefined;
  label = stripDanglingLabelWords(label);
  if (!label) return undefined;
  return label.replace(/^[a-z]/, (character) => character.toUpperCase());
};

export const normalizeCardDate = (
  value?: Date | number | string | null
): string | undefined => {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') return parseIsoDateTime(value)?.toISOString();
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  if (!Number.isFinite(time)) return undefined;
  return date.toISOString();
};

const dateTime = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY;
  return parseIsoDateTime(value)?.getTime() ?? Number.POSITIVE_INFINITY;
};

const readNumber = (value: unknown) => {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(number) ? number : undefined;
};

const normalizeToken = (value: unknown) =>
  typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
    : '';

const readTrend = (value: unknown): CardMetricTrend | undefined => {
  const trend = normalizeToken(value);

  return trend === 'down' || trend === 'flat' || trend === 'up'
    ? trend
    : undefined;
};

const NON_TRENDABLE_METRIC_LABEL_PATTERNS = [
  'best',
  'count',
  'earliest',
  'first',
  'longest',
  'max',
  'maximum',
  'min',
  'minimum',
  'record',
  'regressions',
  'safe_increases',
  'sessions',
  'streak',
  'total',
  'under_threshold',
] as const;

const labelHasTokenPattern = (label: string, pattern: string) => {
  const labelTokens = normalizeToken(label).split('_').filter(Boolean);
  const patternTokens = pattern.split('_').filter(Boolean);
  if (!labelTokens.length || !patternTokens.length) return false;

  return labelTokens.some((_, index) =>
    patternTokens.every(
      (token, offset) => labelTokens[index + offset] === token
    )
  );
};

const readMetricTrend = ({
  label,
  trend,
  value,
  valueFormat,
}: {
  label: string;
  trend: unknown;
  value: string | number;
  valueFormat?: CardMetricValueFormat;
}): CardMetricTrend | undefined => {
  const parsedTrend = readTrend(trend);

  if (!parsedTrend || valueFormat || typeof value !== 'number') {
    return undefined;
  }

  return NON_TRENDABLE_METRIC_LABEL_PATTERNS.some((pattern) =>
    labelHasTokenPattern(label, pattern)
  )
    ? undefined
    : parsedTrend;
};

const readMetricValueFormat = (value: unknown) => {
  const valueFormat = normalizeToken(value);
  if (valueFormat === 'date') return 'date';

  if (
    valueFormat === 'datetime' ||
    valueFormat === 'date_time' ||
    valueFormat === 'date_and_time'
  ) {
    return 'datetime';
  }

  if (
    valueFormat === 'duration_since' ||
    valueFormat === 'durationsince' ||
    valueFormat === 'elapsed_since' ||
    valueFormat === 'elapsedsince' ||
    valueFormat === 'time_since' ||
    valueFormat === 'timesince' ||
    valueFormat === 'days_since' ||
    valueFormat === 'dayssince'
  ) {
    return 'durationSince';
  }

  return undefined;
};

const readXAxisLabelMode = (value: unknown) => {
  const mode = normalizeToken(value);

  return mode === 'all' || mode === 'auto' || mode === 'sparse'
    ? mode
    : undefined;
};

const readAxisInteger = <T extends number>(
  value: unknown,
  allowedValues: readonly T[]
): T | undefined => {
  const number = readNumber(value);
  if (number == null || !Number.isInteger(number)) return undefined;
  return allowedValues.find((allowedValue) => allowedValue === number);
};

const normalizeMetric = (value: unknown) => {
  const metric = asRecord(value);

  const label = normalizeCardDisplayLabel({
    maxLength: MAX_CARD_METRIC_LABEL_LENGTH,
    maxWords: 5,
    value: metric.label,
  });

  let metricValue =
    readNumber(metric.value) ??
    readString(metric.value, MAX_CARD_METRIC_VALUE_LENGTH) ??
    undefined;

  if (!label || metricValue == null) return undefined;
  const unit = readUnit(metric.unit);
  const valueFormat = readMetricValueFormat(metric.valueFormat);

  if (valueFormat) {
    if (typeof metricValue !== 'string') return undefined;
    const dateValue = normalizeCardDate(metricValue);
    if (!dateValue) return undefined;
    metricValue = dateValue;
  }

  const trend = readMetricTrend({
    label,
    trend: metric.trend,
    value: metricValue,
    valueFormat,
  });

  return {
    label,
    ...(trend && { trend }),
    ...(unit && { unit }),
    value: metricValue,
    ...(valueFormat && { valueFormat }),
  };
};

const normalizeMilestone = (value: unknown) => {
  const milestone = asRecord(value);

  const title = normalizeCardDisplayLabel({
    maxLength: 64,
    maxWords: 7,
    value: milestone.title,
  });

  if (!title) return undefined;
  const detail = readString(milestone.detail, MAX_CARD_MILESTONE_DETAIL_LENGTH);

  const date =
    typeof milestone.date === 'string' ||
    typeof milestone.date === 'number' ||
    milestone.date instanceof Date
      ? normalizeCardDate(milestone.date)
      : undefined;

  return { ...(date && { date }), ...(detail && { detail }), title };
};

const normalizeChartDatum = (value: unknown) => {
  const datum = asRecord(value);
  const label = readString(datum.label, MAX_CARD_CHART_DATUM_LABEL_LENGTH);
  const dataValue = readNumber(datum.value);
  return label && dataValue != null ? { label, value: dataValue } : undefined;
};

const normalizeChartData = (value: unknown) =>
  asArray(value)
    .map(normalizeChartDatum)
    .filter((datum): datum is CardChartDatum => !!datum)
    .slice(0, MAX_CARD_CHART_POINTS);

const normalizeChartSeries = (value: unknown) => {
  const series = asRecord(value);

  const label = normalizeCardDisplayLabel({
    maxLength: MAX_CARD_CHART_SERIES_LABEL_LENGTH,
    maxWords: 5,
    value: series.label,
  });

  const data = normalizeChartData(series.data);
  if (!label || !data.length) return undefined;
  const unit = readUnit(series.unit);
  return { data, label, ...(unit && { unit }) };
};

const normalizeChartXAxis = (value: unknown) => {
  const axis = asRecord(value);
  const labelMode = readXAxisLabelMode(axis.labelMode);
  return labelMode ? { labelMode } : undefined;
};

const normalizeChartYAxis = (value: unknown) => {
  const axis = asRecord(value);
  const decimals = readAxisInteger(axis.decimals, [0, 1, 2] as const);
  const tickCount = readAxisInteger(axis.tickCount, [3, 4, 5, 6] as const);

  return decimals != null || tickCount != null
    ? {
        ...(decimals != null && { decimals }),
        ...(tickCount != null && { tickCount }),
      }
    : undefined;
};

const normalizeChart = (value: unknown) => {
  if (value == null) return undefined;
  const chart = asRecord(value);
  const rawType = normalizeToken(chart.type);
  if (rawType !== 'bar' && rawType !== 'line') return undefined;
  const type = rawType;

  const series = asArray(chart.series)
    .map(normalizeChartSeries)
    .filter((series): series is CardChartSeries => !!series)
    .slice(0, MAX_CARD_CHART_SERIES);

  const data = series.length ? [] : normalizeChartData(chart.data);
  if (!data.length && !series.length) return undefined;

  const title = normalizeCardDisplayLabel({
    maxLength: 48,
    maxWords: 6,
    value: chart.title,
  });

  const unit = readUnit(chart.unit);
  const xAxis = normalizeChartXAxis(chart.xAxis);
  const yAxis = normalizeChartYAxis(chart.yAxis);

  return {
    ...(data.length && { data }),
    ...(series.length && { series }),
    ...(title && { title }),
    type,
    ...(unit && { unit }),
    ...(xAxis && { xAxis }),
    ...(yAxis && { yAxis }),
  };
};

const normalizeExactMetricLabelOverrides = (value: unknown) => {
  const overrides = asRecord(value);
  const normalized: Record<string, string> = {};

  for (const [rawKey, rawLabel] of Object.entries(overrides)) {
    const key = rawKey
      .trim()
      .slice(0, MAX_CARD_EXACT_METRIC_OVERRIDE_KEY_LENGTH);

    const label = normalizeCardDisplayLabel({
      maxLength: MAX_CARD_METRIC_LABEL_LENGTH,
      maxWords: 5,
      value: rawLabel,
    });

    if (key && label) normalized[key] = label;
  }

  return Object.keys(normalized).length ? normalized : undefined;
};

export const normalizeRawCardOutput = (value: unknown): unknown => {
  const output = asRecord(value);
  const chart = normalizeChart(output.chart);

  const exactMetricLabelOverrides = normalizeExactMetricLabelOverrides(
    output.exactMetricLabelOverrides
  );

  const summary = readString(output.summary, MAX_CARD_GENERATED_SUMMARY_LENGTH);

  return {
    ...(chart && { chart }),
    ...(exactMetricLabelOverrides && { exactMetricLabelOverrides }),
    metrics: asArray(output.metrics)
      .map(normalizeMetric)
      .filter((metric): metric is NonNullable<typeof metric> => !!metric)
      .slice(0, MAX_CARD_METRICS),
    milestones: asArray(output.milestones)
      .map(normalizeMilestone)
      .filter(
        (milestone): milestone is NonNullable<typeof milestone> => !!milestone
      )
      .slice(0, MAX_CARD_MILESTONES),
    ...(summary && { summary }),
  };
};

export const normalizeCardOutputMilestoneDates = (
  output: CardOutput
): CardOutput => {
  const milestones = output.milestones
    .map((milestone, index) => {
      const { date: rawDate, ...rest } = milestone;
      const date = normalizeCardDate(rawDate);
      return { index, milestone: { ...rest, ...(date && { date }) } };
    })
    .sort((a, b) => {
      const aTime = dateTime(a.milestone.date);
      const bTime = dateTime(b.milestone.date);
      if (aTime !== bTime) return bTime - aTime;
      return b.index - a.index;
    })
    .map(({ milestone }) => milestone);

  return { ...output, milestones };
};

export const stripCardOutputMetadata = (output: CardOutput): CardOutput => {
  const { exactMetricLabelOverrides: _overrides, ...content } = output;
  return content;
};

const mergeCardMetricRefresh = (
  previous: CardOutput['metrics'][number],
  next?: CardOutput['metrics'][number]
) => {
  const value = next?.value ?? previous.value;
  const rawValueFormat = next?.valueFormat ?? previous.valueFormat;

  const valueFormat =
    rawValueFormat && typeof value === 'string' && !!parseIsoDateTime(value)
      ? rawValueFormat
      : undefined;

  const trend = readMetricTrend({
    label: previous.label,
    trend: next?.trend ?? previous.trend,
    value,
    valueFormat,
  });

  const base = { ...previous };
  delete base.trend;
  delete base.valueFormat;

  return {
    ...base,
    ...(trend && { trend }),
    value,
    ...(valueFormat && { valueFormat }),
  };
};

const outputItemByLabel = <T extends { label: string }>(items?: T[]) =>
  new Map((items ?? []).map((item) => [normalizeToken(item.label), item]));

const mergeCardChartRefresh = (
  previous: CardChart,
  next?: CardChart
): CardChart => {
  const nextSeriesByLabel = outputItemByLabel(next?.series);

  return {
    ...previous,
    ...(previous.data?.length && {
      data: next?.data?.length ? next.data : previous.data,
    }),
    ...(previous.series?.length && {
      series: previous.series.map((series, index) => {
        const nextSeries =
          nextSeriesByLabel.get(normalizeToken(series.label)) ??
          next?.series?.[index];

        return {
          ...series,
          data: nextSeries?.data?.length ? nextSeries.data : series.data,
        };
      }),
    }),
  };
};

const mergeCardMilestonesRefresh = (next: CardOutput['milestones']) =>
  next.slice(0, MAX_CARD_MILESTONES);

const mergeCardSummaryRefresh = ({
  next,
  previous,
}: {
  next: CardOutput;
  previous: CardOutput;
}) => {
  if (!previous.summary) return;
  const summary = next.summary?.trim();
  if (summary) return summary;

  return previous.chart ||
    previous.metrics.length > 0 ||
    previous.milestones.length > 0
    ? undefined
    : previous.summary;
};

export const mergeCardOutputRefresh = ({
  next,
  previous,
  replaceMetrics,
}: {
  next: CardOutput;
  previous: CardOutput;
  replaceMetrics?: boolean;
}): CardOutput => {
  const summary = mergeCardSummaryRefresh({ next, previous });
  const nextMetricByLabel = outputItemByLabel(next.metrics);

  return {
    ...(previous.chart && {
      chart: mergeCardChartRefresh(previous.chart, next.chart),
    }),
    ...(next.exactMetricLabelOverrides && {
      exactMetricLabelOverrides: next.exactMetricLabelOverrides,
    }),
    metrics: replaceMetrics
      ? next.metrics
      : previous.metrics.map((metric, index) => {
          const nextMetric =
            nextMetricByLabel.get(normalizeToken(metric.label)) ??
            next.metrics[index];

          return mergeCardMetricRefresh(metric, nextMetric);
        }),
    milestones:
      previous.milestones.length > 0
        ? mergeCardMilestonesRefresh(next.milestones)
        : [],
    ...(summary && { summary }),
  };
};
