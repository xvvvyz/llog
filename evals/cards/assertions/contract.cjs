const {
  chartDataPoints,
  gradingResult,
  parsePayload,
} = require('./helpers.cjs');

const {
  isDateLikeString,
  isDateOnlyString,
  isIsoDateTimeWithZone,
} = require('./date.cjs');

// Mirrors NON_TRENDABLE_METRIC_LABEL_PATTERNS in domain/cards/output.ts.
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
  'safe increases',
  'sessions',
  'streak',
  'total',
  'under threshold',
];

const metricLabelTokens = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const labelHasTokenPattern = (label, pattern) => {
  const labelTokens = metricLabelTokens(label);
  const patternTokens = metricLabelTokens(pattern);
  if (!labelTokens.length || !patternTokens.length) return false;

  return labelTokens.some((_, index) =>
    patternTokens.every(
      (token, offset) => labelTokens[index + offset] === token
    )
  );
};

const isTrendableMetric = (metric) => {
  if (metric.valueFormat || typeof metric.value !== 'number') return false;

  return !NON_TRENDABLE_METRIC_LABEL_PATTERNS.some((pattern) =>
    labelHasTokenPattern(metric.label, pattern)
  );
};

exports.cardOutput = (output) => {
  const payload = parsePayload(output);
  const card = payload.output ?? {};
  const points = chartDataPoints(card.chart);
  const metrics = Array.isArray(card.metrics) ? card.metrics : [];
  const milestones = Array.isArray(card.milestones) ? card.milestones : [];

  const dateLikeChartLabels = points
    .map((point) => point.label)
    .filter(isDateLikeString);

  const metricDateValues = metrics.filter(
    (metric) =>
      metric.valueFormat === 'date' || metric.valueFormat === 'datetime'
  );

  return gradingResult({
    checks: [
      {
        name: 'validates CardOutput',
        pass: payload.strictValidation?.success === true,
      },
      {
        name: 'chart points are minimal',
        pass: points.every((point) => {
          const keys = Object.keys(point).sort();

          return (
            keys.length === 2 && keys[0] === 'label' && keys[1] === 'value'
          );
        }),
      },
      {
        name: 'date-like chart labels use full iso',
        pass: dateLikeChartLabels.every(isIsoDateTimeWithZone),
      },
      {
        name: 'milestone dates use full iso',
        pass: milestones.every(
          (milestone) =>
            !milestone.date || isIsoDateTimeWithZone(milestone.date)
        ),
      },
      {
        name: 'date metrics use full iso',
        pass: metricDateValues.every((metric) =>
          isIsoDateTimeWithZone(metric.value)
        ),
      },
      {
        name: 'date metrics specify display',
        pass: metrics.every(
          (metric) =>
            !isIsoDateTimeWithZone(metric.value) ||
            metric.valueFormat === 'date' ||
            metric.valueFormat === 'datetime'
        ),
      },
      {
        name: 'non-trendable metric trends omitted',
        pass: metrics.every(
          (metric) => !metric.trend || isTrendableMetric(metric)
        ),
      },
      {
        name: 'no date-only structured dates',
        pass:
          !dateLikeChartLabels.some(isDateOnlyString) &&
          !milestones.some((milestone) => isDateOnlyString(milestone.date)) &&
          !metrics.some((metric) => isDateOnlyString(metric.value)),
      },
      {
        name: 'source ids present',
        pass:
          Array.isArray(card.sourceRecordIds) &&
          card.sourceRecordIds.length > 0,
      },
    ],
    reason: 'Card output contract passed',
  });
};
