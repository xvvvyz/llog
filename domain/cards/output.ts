import { z } from 'zod/v4';

export const MAX_CARD_CHART_POINTS = 60;

export const MAX_CARD_CHART_SERIES = 4;

export const MAX_CARD_METRICS = 6;

export const MAX_CARD_MILESTONES = 8;

export const MAX_CARD_SOURCE_RECORD_IDS = 80;

export const cardMetricSchema = z
  .object({
    featured: z.boolean(),
    label: z.string().min(1).max(40),
    trend: z.enum(['down', 'flat', 'up']).optional(),
    unit: z.string().max(16).optional(),
    value: z.union([z.string().max(40), z.number()]),
  })
  .strict();

export const cardMilestoneSchema = z
  .object({
    date: z.string().max(32).optional(),
    detail: z.string().max(240).optional(),
    recordIds: z.array(z.string().min(1)).max(20).optional(),
    title: z.string().min(1).max(80),
  })
  .strict();

export const cardChartDatumSchema = z
  .object({ label: z.string().min(1).max(32), value: z.number() })
  .strict();

export const cardChartSeriesSchema = z
  .object({
    data: z.array(cardChartDatumSchema).min(1).max(MAX_CARD_CHART_POINTS),
    label: z.string().min(1).max(40),
    unit: z.string().max(16).optional(),
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
    title: z.string().max(80).optional(),
    type: z.enum(['bar', 'line']),
    unit: z.string().max(16).optional(),
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
    metrics: z.array(cardMetricSchema).max(MAX_CARD_METRICS).default([]),
    milestones: z
      .array(cardMilestoneSchema)
      .max(MAX_CARD_MILESTONES)
      .default([]),
    sourceRecordIds: z
      .array(z.string().min(1))
      .max(MAX_CARD_SOURCE_RECORD_IDS)
      .default([]),
    summary: z.string().min(1).max(1200).optional(),
  })
  .strict()
  .refine(
    (output) =>
      !!output.chart ||
      output.metrics.length > 0 ||
      output.milestones.length > 0 ||
      !!output.summary?.trim(),
    { message: 'Card output requires content' }
  )
  .refine(
    (output) =>
      output.metrics.length === 0 ||
      output.metrics.some((metric) => metric.featured),
    { message: 'Metrics require at least one featured metric' }
  )
  .refine(
    (output) => output.metrics.filter((metric) => metric.featured).length <= 4,
    { message: 'Metrics can feature at most four stats' }
  );

export type CardOutput = z.infer<typeof cardOutputSchema>;

export type CardChart = z.infer<typeof cardChartSchema>;

export type CardChartDatum = z.infer<typeof cardChartDatumSchema>;

export type CardChartSeries = z.infer<typeof cardChartSeriesSchema>;

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
  return label.replace(/^[a-z]/, (character) => character.toUpperCase());
};

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseDateOnly = (value: string) => {
  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? match[0]
    : undefined;
};

const isDateOnlyString = (value: unknown) =>
  typeof value === 'string' && DATE_ONLY_PATTERN.test(value.trim());

export const normalizeCardDate = (
  value?: Date | number | string | null
): string | undefined => {
  if (value == null || value === '') return undefined;
  if (isDateOnlyString(value)) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  if (!Number.isFinite(time)) return undefined;
  return date.toISOString();
};

const dateTime = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const dateOnly = parseDateOnly(value);

  if (dateOnly) {
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
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

const readTrend = (value: unknown) => {
  const trend = normalizeToken(value);

  return trend === 'down' || trend === 'flat' || trend === 'up'
    ? trend
    : undefined;
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

const readRecordIds = (value: unknown, maxLength: number) =>
  asArray(value)
    .map((item) => readString(item, 120))
    .filter((id): id is string => !!id)
    .slice(0, maxLength);

const normalizeMetric = (value: unknown) => {
  const metric = asRecord(value);

  const label = normalizeCardDisplayLabel({
    maxLength: 40,
    maxWords: 5,
    value: metric.label,
  });

  const metricValue =
    readNumber(metric.value) ?? readString(metric.value, 40) ?? undefined;

  if (!label || metricValue == null) return undefined;
  const trend = readTrend(metric.trend);
  const unit = readUnit(metric.unit);

  return {
    featured: metric.featured === true,
    label,
    ...(trend && { trend }),
    ...(unit && { unit }),
    value: metricValue,
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
  const detail = readString(milestone.detail, 240);

  const date =
    typeof milestone.date === 'string' ||
    typeof milestone.date === 'number' ||
    milestone.date instanceof Date
      ? normalizeCardDate(milestone.date)
      : undefined;

  const recordIds = readRecordIds(milestone.recordIds, 20);

  return {
    ...(date && { date }),
    ...(detail && { detail }),
    ...(recordIds.length > 0 && { recordIds }),
    title,
  };
};

const normalizeChartDatum = (value: unknown) => {
  const datum = asRecord(value);
  const label = readString(datum.label, 32);
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
    maxLength: 40,
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

export const normalizeRawCardOutput = (value: unknown): unknown => {
  const output = asRecord(value);
  const chart = normalizeChart(output.chart);
  const summary = readString(output.summary, 1200);

  return {
    ...(chart && { chart }),
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
    sourceRecordIds: readRecordIds(
      output.sourceRecordIds,
      MAX_CARD_SOURCE_RECORD_IDS
    ),
    ...(summary && { summary }),
  };
};

export const normalizeCardOutputSourceIds = (
  output: CardOutput,
  allowedSourceIds: Iterable<string>
): CardOutput => {
  const allowed = new Set(allowedSourceIds);

  const keepAllowedIds = (ids?: string[]) =>
    (ids ?? []).filter((id) => allowed.has(id));

  return {
    ...output,
    milestones: output.milestones.map((milestone) => ({
      ...milestone,
      recordIds: keepAllowedIds(milestone.recordIds),
    })),
    sourceRecordIds: keepAllowedIds(output.sourceRecordIds),
  };
};

export const normalizeCardOutputMilestoneDates = (
  output: CardOutput,
  records: { date?: Date | number | string | null; id: string }[]
): CardOutput => {
  const dateByRecordId = new Map(
    records
      .map((record) => [record.id, normalizeCardDate(record.date)] as const)
      .filter((entry): entry is readonly [string, string] => !!entry[1])
  );

  const milestones = output.milestones
    .map((milestone, index) => {
      const recordDates = (milestone.recordIds ?? [])
        .map((recordId) => dateByRecordId.get(recordId))
        .filter((date): date is string => !!date)
        .sort((a, b) => dateTime(a) - dateTime(b));

      const date =
        (isDateOnlyString(milestone.date)
          ? undefined
          : normalizeCardDate(milestone.date)) ??
        recordDates.at(-1) ??
        undefined;

      return { index, milestone: { ...milestone, ...(date && { date }) } };
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

const mergeCardMetricRefresh = (
  previous: CardOutput['metrics'][number],
  next?: CardOutput['metrics'][number]
) => ({
  ...previous,
  ...(next?.trend && { trend: next.trend }),
  value: next?.value ?? previous.value,
});

const mergeCardChartRefresh = (
  previous: CardChart,
  next?: CardChart
): CardChart => ({
  ...previous,
  ...(previous.data?.length && {
    data: next?.data?.length ? next.data : previous.data,
  }),
  ...(previous.series?.length && {
    series: previous.series.map((series, index) => ({
      ...series,
      data: next?.series?.[index]?.data?.length
        ? next.series[index].data
        : series.data,
    })),
  }),
});

const milestoneKey = (milestone: CardOutput['milestones'][number]) =>
  [milestone.title.trim().toLowerCase(), milestone.date?.trim() ?? ''].join(
    '\n'
  );

const mergeCardMilestonesRefresh = (
  previous: CardOutput['milestones'],
  next: CardOutput['milestones']
) => {
  const milestones = previous.slice(0, MAX_CARD_MILESTONES);
  const seenKeys = new Set(milestones.map(milestoneKey));

  for (const milestone of next) {
    if (milestones.length >= MAX_CARD_MILESTONES) break;
    const key = milestoneKey(milestone);
    if (seenKeys.has(key)) continue;
    milestones.push(milestone);
    seenKeys.add(key);
  }

  return milestones;
};

const mergeSourceRecordIdsRefresh = (previous: string[], next: string[]) =>
  [...new Set([...next, ...previous].filter(Boolean))].slice(
    0,
    MAX_CARD_SOURCE_RECORD_IDS
  );

export const mergeCardOutputRefresh = ({
  next,
  previous,
}: {
  next: CardOutput;
  previous: CardOutput;
}): CardOutput => ({
  ...(previous.chart && {
    chart: mergeCardChartRefresh(previous.chart, next.chart),
  }),
  metrics: previous.metrics.map((metric, index) =>
    mergeCardMetricRefresh(metric, next.metrics[index])
  ),
  milestones:
    previous.milestones.length > 0
      ? mergeCardMilestonesRefresh(previous.milestones, next.milestones)
      : [],
  sourceRecordIds: mergeSourceRecordIdsRefresh(
    previous.sourceRecordIds,
    next.sourceRecordIds
  ),
  ...(previous.summary && { summary: next.summary ?? previous.summary }),
});
