const {
  chartDataPoints,
  gradingResult,
  metricByTerms,
  normalizeLabel,
  numericMetric,
  parsePayload,
  readFixture,
} = require('./helpers.cjs');

const chartValue = (points, label) =>
  points.find((point) => normalizeLabel(point.label) === normalizeLabel(label))
    ?.value;

const labelTerms = (label) =>
  normalizeLabel(label).split(/\s+/).filter(Boolean);

exports.exactCounts = (output, context) => {
  const payload = parsePayload(output);
  const fixture = readFixture(context);
  const expected = fixture.exact?.expected ?? {};
  const expectedDateMetrics = expected.dateMetrics ?? {};
  const expectedMetrics = expected.metrics ?? {};
  const expectedLabelOverrides = expected.labelOverrides ?? {};
  const expectedChart = expected.chart ?? {};
  const metrics = payload.output?.metrics ?? [];
  const points = chartDataPoints(payload.output?.chart);
  const labelOverrides = payload.output?.exactMetricLabelOverrides ?? {};

  return gradingResult({
    checks: [
      ...Object.entries(expectedMetrics).map(([label, value]) => ({
        name: `${label} metric is locked`,
        pass: numericMetric(metrics, labelTerms(label)) === value,
      })),
      ...Object.entries(expectedDateMetrics).map(([label, value]) => ({
        name: `${label} date metric is locked`,
        pass: metricByTerms(metrics, labelTerms(label))?.value === value,
      })),
      ...Object.entries(expectedLabelOverrides).map(([key, label]) => ({
        name: `${key} label override is preserved`,
        pass: normalizeLabel(labelOverrides[key]) === normalizeLabel(label),
      })),
      ...Object.entries(expectedChart).map(([label, value]) => ({
        name: `${label} chart point is locked`,
        pass: chartValue(points, label) === value,
      })),
    ],
    reason: 'Exact cached facts matched output',
  });
};
