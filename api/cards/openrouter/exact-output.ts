import * as cardAnalysis from '@/domain/cards/analysis';
import * as cardOutput from '@/domain/cards/output';

type CardMetric = cardOutput.CardOutput['metrics'][number];
type CardChart = cardOutput.CardChart;
type ExactMetricEntry = { id: string; metric: CardMetric };

const withCarriedAnnotations = (
  exactChart: CardChart,
  outputChart?: CardChart
): CardChart => {
  const annotations = outputChart?.annotations;
  if (exactChart.type !== 'line' || !annotations?.length) return exactChart;
  const labels = cardOutput.getChartPointLabels(exactChart);
  const carried = annotations.filter((annotation) => labels.has(annotation.x));
  return carried.length ? { ...exactChart, annotations: carried } : exactChart;
};

const METRIC_IDENTITY_FILLER_WORDS = new Set([
  'count',
  'matching',
  'number',
  'of',
  'selected',
  'source',
  'total',
]);

const normalizeMetricIdentityLabel = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map((token) =>
      token.length > 3 && token.endsWith('s') && !token.endsWith('ss')
        ? token.slice(0, -1)
        : token
    )
    .filter((token) => token && !METRIC_IDENTITY_FILLER_WORDS.has(token))
    .join(' ');

const metricValueIdentity = (metric: CardMetric) =>
  JSON.stringify({
    unit: metric.unit ?? '',
    value: metric.value,
    valueFormat: metric.valueFormat ?? '',
    valueType: typeof metric.value,
  });

const normalizeOverrideLabel = (value: unknown) =>
  cardOutput.normalizeCardDisplayLabel({
    maxLength: cardOutput.MAX_CARD_METRIC_LABEL_LENGTH,
    maxWords: 5,
    value,
  });

const fallbackExactMetricId = (metric: CardMetric, index: number) => {
  const label = normalizeMetricIdentityLabel(metric.label);
  return label || `metric_${index + 1}`;
};

const exactMetricEntries = (
  exactFacts: cardAnalysis.ExactCardFacts
): ExactMetricEntry[] => {
  if (exactFacts.exactMetricBindings?.length) {
    return exactFacts.exactMetricBindings.map(({ aggregationId, metric }) => ({
      id: aggregationId,
      metric,
    }));
  }

  return exactFacts.metrics.map((metric, index) => ({
    id: fallbackExactMetricId(metric, index),
    metric,
  }));
};

type StreakLabelOperation = 'current' | 'longest';
const STREAK_LABEL_PATTERN = /\bstreak\b/i;
const currentStreakLabelPattern = /\b(?:active|current|ongoing)\b/i;
const longestStreakLabelPattern = /\b(?:best|longest)\b/i;

const streakOperationFromText = (
  value: string
): StreakLabelOperation | undefined => {
  const hasLongest = longestStreakLabelPattern.test(value);
  const hasCurrent = currentStreakLabelPattern.test(value);
  if (hasLongest && !hasCurrent) return 'longest';
  if (hasCurrent && !hasLongest) return 'current';
  return undefined;
};

const setUniqueIndexValue = <T>(
  index: Map<string, T | null>,
  key: string,
  value: T
) => {
  if (!key) return;
  index.set(key, index.has(key) ? null : value);
};

const exactMetricIndexes = (
  metrics: ExactMetricEntry[],
  overrides: Record<string, string>
) => {
  const byLabel = metrics.reduce((index, entry) => {
    setUniqueIndexValue(index, entry.metric.label.trim().toLowerCase(), entry);

    setUniqueIndexValue(
      index,
      overrides[entry.id]?.trim().toLowerCase() ?? '',
      entry
    );

    return index;
  }, new Map<string, ExactMetricEntry | null>());

  const byIdentity = metrics.reduce((index, entry) => {
    const label = normalizeMetricIdentityLabel(entry.metric.label);
    setUniqueIndexValue(index, label, entry);
    return index;
  }, new Map<string, ExactMetricEntry | null>());

  const byValue = metrics.reduce((index, entry) => {
    const key = metricValueIdentity(entry.metric);
    setUniqueIndexValue(index, key, entry);
    return index;
  }, new Map<string, ExactMetricEntry | null>());

  return { byIdentity, byLabel, byValue };
};

const matchExactMetric = ({
  indexes,
  metric,
}: {
  indexes: ReturnType<typeof exactMetricIndexes>;
  metric: CardMetric;
}) =>
  indexes.byLabel.get(metric.label.trim().toLowerCase()) ??
  indexes.byIdentity.get(normalizeMetricIdentityLabel(metric.label)) ??
  indexes.byValue.get(metricValueIdentity(metric));

const mergeExactMetric = ({
  exactMetricEntry,
  labelOverride,
  metric,
}: {
  exactMetricEntry: ExactMetricEntry;
  labelOverride?: string;
  metric: CardMetric;
}) => {
  const exactMetric = exactMetricEntry.metric;

  const trend =
    typeof exactMetric.value === 'number' && !exactMetric.valueFormat
      ? (exactMetric.trend ?? metric.trend)
      : undefined;

  return {
    ...exactMetric,
    ...(labelOverride && { label: labelOverride }),
    ...(trend && { trend }),
  };
};

const normalizeStreakUnit = (value?: string) => {
  const unit = value?.trim().toLowerCase();
  if (!unit) return '';
  return unit.endsWith('s') ? unit.slice(0, -1) : unit;
};

const summaryStreakClaimPattern =
  /\b(-?\d+(?:\.\d+)?)\s*(records?|sessions?|days?|weeks?|months?)\b/gi;

const hasUnsupportedStreakSummaryClaim = (output: cardOutput.CardOutput) => {
  const summary = output.summary;
  if (!summary || !STREAK_LABEL_PATTERN.test(summary)) return false;

  const streakMetrics = output.metrics
    .filter(
      (metric) =>
        STREAK_LABEL_PATTERN.test(metric.label) &&
        typeof metric.value === 'number'
    )
    .map((metric) => ({
      operation: streakOperationFromText(metric.label),
      unit: normalizeStreakUnit(metric.unit),
      value: metric.value,
    }));

  if (!streakMetrics.length) return true;

  for (const match of summary.matchAll(summaryStreakClaimPattern)) {
    const matchIndex = match.index ?? 0;

    const context = summary.slice(
      Math.max(0, matchIndex - 80),
      Math.min(summary.length, matchIndex + match[0].length + 80)
    );

    if (!STREAK_LABEL_PATTERN.test(context)) continue;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return true;
    const unit = normalizeStreakUnit(match[2]);
    const operation = streakOperationFromText(context);

    const supported = streakMetrics.some(
      (metric) =>
        metric.value === value &&
        (!metric.unit || !unit || metric.unit === unit) &&
        (!operation || metric.operation === operation)
    );

    if (!supported) return true;
  }

  return false;
};

const removeUnsupportedStreakSummary = (output: cardOutput.CardOutput) => {
  if (!hasUnsupportedStreakSummaryClaim(output)) return output;
  const { summary: _summary, ...rest } = output;
  return rest;
};

export const mergeExactCardOutput = ({
  allowExactMetricLabelOverrides = false,
  appendMissingExactMetrics = true,
  exactFacts,
  output,
  previousOutput,
}: {
  allowExactMetricLabelOverrides?: boolean;
  appendMissingExactMetrics?: boolean;
  exactFacts?: cardAnalysis.ExactCardFacts;
  output: cardOutput.CardOutput;
  previousOutput?: cardOutput.CardOutput;
}): cardOutput.CardOutput => {
  if (!exactFacts) return output;
  const exactChart = exactFacts.chart;
  const outputChart = output.chart;

  const chartKindsMatch =
    !exactChart || !outputChart || exactChart.type === outputChart.type;

  const shouldMergeChart = !!exactChart && (!outputChart || chartKindsMatch);

  // The exact chart replaces the model's chart, so re-attach any annotations the
  // model authored that still line up with a locked point on the exact chart.
  const mergedExactChart =
    shouldMergeChart && exactChart
      ? withCarriedAnnotations(exactChart, outputChart)
      : undefined;

  const matchedExactMetrics = new Set<ExactMetricEntry>();

  const overrides = {
    ...(previousOutput?.exactMetricLabelOverrides ?? {}),
    ...(output.exactMetricLabelOverrides ?? {}),
  };

  const exactMetrics = exactMetricEntries(exactFacts);
  const indexes = exactMetricIndexes(exactMetrics, overrides);

  const metrics = output.metrics.map((metric, index) => {
    const exactMetricEntry =
      matchExactMetric({ indexes, metric }) ??
      (allowExactMetricLabelOverrides && previousOutput?.metrics[index]
        ? matchExactMetric({ indexes, metric: previousOutput.metrics[index] })
        : undefined);

    if (!exactMetricEntry) return metric;
    matchedExactMetrics.add(exactMetricEntry);

    if (allowExactMetricLabelOverrides) {
      const override = normalizeOverrideLabel(metric.label);

      if (override && override !== exactMetricEntry.metric.label) {
        overrides[exactMetricEntry.id] = override;
      } else {
        delete overrides[exactMetricEntry.id];
      }
    }

    return mergeExactMetric({
      exactMetricEntry,
      labelOverride: overrides[exactMetricEntry.id],
      metric,
    });
  });

  const shouldAppendExactMetrics =
    appendMissingExactMetrics && output.metrics.length === 0;

  const visibleOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([key]) =>
      exactMetrics.some((metric) => metric.id === key)
    )
  );

  const { exactMetricLabelOverrides: _overrides, ...outputContent } = output;

  return removeUnsupportedStreakSummary({
    ...outputContent,
    ...(mergedExactChart && { chart: mergedExactChart }),
    ...(Object.keys(visibleOverrides).length > 0 && {
      exactMetricLabelOverrides: visibleOverrides,
    }),
    metrics: [
      ...metrics,
      ...(shouldAppendExactMetrics
        ? exactMetrics
            .filter((metric) => !matchedExactMetrics.has(metric))
            .map((exactMetricEntry) =>
              mergeExactMetric({
                exactMetricEntry,
                labelOverride: overrides[exactMetricEntry.id],
                metric: exactMetricEntry.metric,
              })
            )
        : []),
    ].slice(0, cardOutput.MAX_CARD_METRICS),
  });
};
