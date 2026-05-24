const {
  chartDataPoints,
  gradingResult,
  parsePayload,
} = require('./helpers.cjs');

const { isDateLikeString, isIsoDateTimeWithZone } = require('./date.cjs');

const textFromValue = (value) => {
  if (value == null) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) return value.map(textFromValue).join(' ');

  if (typeof value === 'object') {
    return Object.values(value).map(textFromValue).join(' ');
  }

  return '';
};

exports.nestedSources = (output) => {
  const payload = parsePayload(output);
  const card = payload.output ?? {};
  const allText = textFromValue(card);
  const lower = allText.toLowerCase();
  const points = chartDataPoints(card.chart);

  const dateLikeTokens = [
    ...points.map((point) => point.label),
    ...(Array.isArray(card.milestones)
      ? card.milestones.map((milestone) => milestone.date)
      : []),
    ...(Array.isArray(card.metrics)
      ? card.metrics
          .filter(
            (metric) =>
              metric.valueFormat === 'date' ||
              metric.valueFormat === 'datetime' ||
              metric.valueFormat === 'durationSince'
          )
          .map((metric) => metric.value)
      : []),
  ].filter(isDateLikeString);

  return gradingResult({
    checks: [
      {
        name: 'uses reply author evidence',
        pass: allText.includes('Mina') && lower.includes('mood'),
      },
      {
        name: 'uses transcript evidence',
        pass: lower.includes('medication') && lower.includes('walk'),
      },
      {
        name: 'keeps source dates iso',
        pass: dateLikeTokens.every(isIsoDateTimeWithZone),
      },
      {
        name: 'excludes draft reply',
        pass: !allText.includes('Draft Person') && !lower.includes('draft'),
      },
      {
        name: 'does not invent unsupported authors',
        pass: !/\b(?:alex|sam|jordan|taylor|doctor|nurse)\b/i.test(allText),
      },
    ],
    reason: 'Nested source evidence passed',
  });
};
