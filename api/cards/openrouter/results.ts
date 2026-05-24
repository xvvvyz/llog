import * as cardAnalysis from '@/domain/cards/analysis';
import * as cardOutput from '@/domain/cards/output';
import { asRecord, cleanTitle } from './utils';

type CardMetric = cardOutput.CardOutput['metrics'][number];

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

const exactMetricIndexes = (metrics: CardMetric[]) => {
  const byLabel = new Map(
    metrics.map((metric) => [metric.label.trim().toLowerCase(), metric])
  );

  const byIdentity = metrics.reduce((index, metric) => {
    const label = normalizeMetricIdentityLabel(metric.label);
    if (!label) return index;
    index.set(label, index.has(label) ? null : metric);
    return index;
  }, new Map<string, CardMetric | null>());

  return { byIdentity, byLabel };
};

const matchExactMetric = ({
  indexes,
  metric,
}: {
  indexes: ReturnType<typeof exactMetricIndexes>;
  metric: CardMetric;
}) =>
  indexes.byLabel.get(metric.label.trim().toLowerCase()) ??
  indexes.byIdentity.get(normalizeMetricIdentityLabel(metric.label));

const mergeExactCardOutput = ({
  appendMissingExactMetrics = true,
  exactFacts,
  output,
}: {
  appendMissingExactMetrics?: boolean;
  exactFacts?: cardAnalysis.ExactCardFacts;
  output: cardOutput.CardOutput;
}): cardOutput.CardOutput => {
  if (!exactFacts) return output;
  const exactChart = exactFacts.chart;
  const outputChart = output.chart;

  const chartKindsMatch =
    !exactChart ||
    !outputChart ||
    (exactChart.type === outputChart.type &&
      !!exactChart.series?.length === !!outputChart.series?.length);

  const shouldMergeChart = !!exactChart && (!outputChart || chartKindsMatch);
  const exactMetrics = new Set<CardMetric>();
  const indexes = exactMetricIndexes(exactFacts.metrics);

  const metrics = output.metrics.map((metric) => {
    const exactMetric = matchExactMetric({ indexes, metric });
    if (!exactMetric) return metric;
    exactMetrics.add(exactMetric);

    return metric.label.trim().toLowerCase() ===
      exactMetric.label.trim().toLowerCase()
      ? exactMetric
      : { ...exactMetric, label: metric.label };
  });

  const shouldAppendExactMetrics =
    appendMissingExactMetrics &&
    (output.metrics.length === 0 || shouldMergeChart || !output.chart);

  return {
    ...output,
    ...(shouldMergeChart && { chart: exactChart }),
    metrics: [
      ...metrics,
      ...(shouldAppendExactMetrics
        ? exactFacts.metrics.filter((metric) => !exactMetrics.has(metric))
        : []),
    ].slice(0, cardOutput.MAX_CARD_METRICS),
  };
};

export const parseCardOutputResult = ({
  appendMissingExactMetrics,
  exactFacts,
  parsedJson,
}: {
  appendMissingExactMetrics?: boolean;
  exactFacts?: cardAnalysis.ExactCardFacts;
  parsedJson: unknown;
}) => {
  const root = asRecord(parsedJson);

  const normalizedJson = mergeExactCardOutput({
    appendMissingExactMetrics,
    exactFacts,
    output: cardOutput.normalizeRawCardOutput(
      root.output
    ) as cardOutput.CardOutput,
  });

  const parsedOutput = cardOutput.validateCardOutput(normalizedJson);

  if (!parsedOutput.success) {
    const issues = parsedOutput.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.') || 'output'}: ${issue.message}`)
      .join('; ');

    return {
      errorMessage: `OpenRouter card generation returned invalid output${issues ? ` (${issues})` : ''}`,
      success: false as const,
    };
  }

  const output = cardOutput.normalizeCardOutputMilestoneDates(
    parsedOutput.data
  );

  return { output, root, success: true as const };
};

export const parseGeneratedCardResult = ({
  defaultTitle,
  exactFacts,
  parsedJson,
}: {
  defaultTitle: string;
  exactFacts?: cardAnalysis.ExactCardFacts;
  parsedJson: unknown;
}) => {
  const parsedOutput = parseCardOutputResult({ exactFacts, parsedJson });
  if (!parsedOutput.success) return parsedOutput;

  return {
    output: parsedOutput.output,
    success: true as const,
    title: cleanTitle(parsedOutput.root.title, defaultTitle),
  };
};

export const parseTweakedCardResult = ({
  defaultTitle,
  exactFacts,
  parsedJson,
}: {
  defaultTitle: string;
  exactFacts?: cardAnalysis.ExactCardFacts;
  parsedJson: unknown;
}) => {
  const parsedOutput = parseCardOutputResult({
    appendMissingExactMetrics: false,
    exactFacts,
    parsedJson,
  });

  if (!parsedOutput.success) return parsedOutput;

  return {
    output: parsedOutput.output,
    success: true as const,
    title: cleanTitle(parsedOutput.root.title, defaultTitle),
  };
};
