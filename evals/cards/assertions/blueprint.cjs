const {
  gradingResult,
  metricText,
  numericMetric,
  parsePayload,
  readFixture,
} = require('./helpers.cjs');

exports.blueprint = (output, context) => {
  const payload = parsePayload(output);
  const fixture = readFixture(context);
  const expected = fixture.expected.blueprint;
  const card = payload.output ?? {};
  const chart = card.chart ?? {};
  const metrics = Array.isArray(card.metrics) ? card.metrics : [];
  const metricLabels = metrics.map((metric) => metric.label);
  const milestones = Array.isArray(card.milestones) ? card.milestones : [];

  return gradingResult({
    checks: [
      { name: 'runs blueprint mode', pass: payload.mode === 'blueprint' },
      {
        name: 'preserves metric labels',
        pass:
          JSON.stringify(metricLabels) ===
          JSON.stringify(expected.metricLabels),
      },
      {
        name: 'preserves chart config',
        pass:
          chart.type === expected.chart.type &&
          chart.title === expected.chart.title &&
          chart.yAxis?.decimals === expected.chart.decimals,
      },
      {
        name: 'recomputes average sleep',
        pass: numericMetric(metrics, ['average', 'sleep']) === 5.5,
      },
      {
        name: 'recomputes latest debt',
        pass: numericMetric(metrics, ['sleep', 'debt']) === 2,
      },
      {
        name: 'does not reuse source average',
        pass: numericMetric(metrics, ['average', 'sleep']) !== 8.2,
      },
      {
        name: 'does not reuse source debt',
        pass: !metricText(metrics, ['sleep', 'debt']).includes('0.5'),
      },
      { name: 'keeps milestone section', pass: milestones.length > 0 },
    ],
    reason: 'Blueprint eval passed',
  });
};
