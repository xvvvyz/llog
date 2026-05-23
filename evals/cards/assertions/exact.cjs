const {
  chartDataPoints,
  gradingResult,
  normalizeLabel,
  numericMetric,
  parsePayload,
  readFixture,
} = require('./helpers.cjs');

const chartValue = (points, label) =>
  points.find((point) => normalizeLabel(point.label) === normalizeLabel(label))
    ?.value;

exports.exactCounts = (output, context) => {
  const payload = parsePayload(output);
  const fixture = readFixture(context);
  const expected = fixture.exact?.expected ?? {};
  const expectedMetrics = expected.metrics ?? {};
  const expectedChart = expected.chart ?? {};
  const metrics = payload.output?.metrics ?? [];
  const points = chartDataPoints(payload.output?.chart);

  return gradingResult({
    checks: [
      ...Object.entries(expectedMetrics).map(([label, value]) => ({
        name: `${label} metric is locked`,
        pass: numericMetric(metrics, [normalizeLabel(label)]) === value,
      })),
      ...Object.entries(expectedChart).map(([label, value]) => ({
        name: `${label} chart point is locked`,
        pass: chartValue(points, label) === value,
      })),
    ],
    reason: 'Exact cached facts matched output',
  });
};
