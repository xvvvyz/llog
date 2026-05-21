const {
  chartDataPoints,
  gradingResult,
  parsePayload,
} = require('./helpers.cjs');

exports.cardOutput = (output) => {
  const payload = parsePayload(output);
  const card = payload.output ?? {};
  const points = chartDataPoints(card.chart);

  return gradingResult({
    checks: [
      {
        name: 'strict CardOutput validation passes',
        pass: payload.strictValidation?.success === true,
      },
      {
        name: 'chart points only contain label and value',
        pass: points.every((point) => {
          const keys = Object.keys(point).sort();

          return (
            keys.length === 2 && keys[0] === 'label' && keys[1] === 'value'
          );
        }),
      },
      {
        name: 'sourceRecordIds are present',
        pass:
          Array.isArray(card.sourceRecordIds) &&
          card.sourceRecordIds.length > 0,
      },
    ],
    reason: 'Card output contract passed',
  });
};
