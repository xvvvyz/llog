const {
  allRecordIds,
  fixtureSeries,
  gradingResult,
  includesAll,
  metricByTerms,
  metricText,
  milestoneDates,
  milestoneForDate,
  normalizeLabel,
  numericMetric,
  parsePayload,
  parseSessionValue,
  readFixture,
  recordIdByDate,
  recordsByDate,
  sameSeriesData,
  seriesByTerms,
} = require('./helpers.cjs');

const DURATION_METRIC_LABELS = [
  'Latest duration',
  'Latest distress',
  'Under threshold',
  'Safe increases',
  'Regressions',
];

const cardParts = (payload) => {
  const card = payload.output ?? {};

  return {
    card,
    chart: card.chart ?? {},
    metrics: Array.isArray(card.metrics) ? card.metrics : [],
    milestones: Array.isArray(card.milestones) ? card.milestones : [],
    sourceRecordIds: Array.isArray(card.sourceRecordIds)
      ? card.sourceRecordIds
      : [],
  };
};

const durationFixtures = (records) => ({
  distressFixture: fixtureSeries(records, 'Peak distress \\(0-5\\)'),
  durationFixture: fixtureSeries(records, 'Alone duration \\(min\\)'),
});

const requiredMilestoneDates = (expected) => [
  expected.latestHighWaterMark,
  expected.firstHour,
  expected.firstSubthresholdIncrease,
  ...expected.regressions,
];

const hasExpectedUnderThreshold = (metrics, expected) => {
  const underThreshold = metricText(metrics, ['under', 'threshold']);

  return (
    underThreshold.includes(String(expected.underThreshold).split('/')[0]) &&
    underThreshold.includes(String(expected.underThreshold).split('/')[1])
  );
};

const metricsHaveNoTrend = (metrics, termGroups) =>
  termGroups.every((terms) => !metricByTerms(metrics, terms)?.trend);

const durationAggregateMetricTerms = [
  ['under', 'threshold'],
  ['safe', 'increase'],
  ['regression'],
];

const triggerAggregateMetricTerms = [
  ['trigger'],
  ['distress'],
  ['whine'],
  ['bark'],
];

exports.separationAnxiety = (output, context) => {
  const payload = parsePayload(output);
  const fixture = readFixture(context);
  const expected = fixture.expected;
  const { chart, metrics, milestones, sourceRecordIds } = cardParts(payload);
  const series = Array.isArray(chart.series) ? chart.series : [];
  const duration = seriesByTerms(series, ['duration']);
  const distress = seriesByTerms(series, ['distress']);

  const { distressFixture, durationFixture } = durationFixtures(
    fixture.records
  );

  const dates = milestoneDates(milestones);
  const milestoneDateList = requiredMilestoneDates(expected);

  const newestFirst = dates.every((date, index) => {
    const next = dates[index + 1];
    return !next || new Date(date).getTime() >= new Date(next).getTime();
  });

  const milestoneEvidence = milestoneDateList.every((date) => {
    const milestone = milestoneForDate(milestones, date);
    const recordId = recordIdByDate(fixture.records, date);

    return (
      !!milestone &&
      !!recordId &&
      Array.isArray(milestone.recordIds) &&
      milestone.recordIds.includes(recordId)
    );
  });

  const sourceEvidence = milestoneDateList.every((date) => {
    const recordId = recordIdByDate(fixture.records, date);
    return !!recordId && sourceRecordIds.includes(recordId);
  });

  return gradingResult({
    checks: [
      {
        name: 'uses all fixture records',
        pass: payload.fixture?.recordCount === expected.sessionCount,
      },
      {
        name: 'returns line series',
        pass: chart.type === 'line' && series.length === 2,
      },
      {
        name: 'uses chart.series only',
        pass: !Array.isArray(chart.data) || chart.data.length === 0,
      },
      {
        name: 'duration matches sessions',
        pass:
          !!duration && sameSeriesData(duration.data ?? [], durationFixture),
      },
      {
        name: 'distress matches sessions',
        pass:
          !!distress && sameSeriesData(distress.data ?? [], distressFixture),
      },
      {
        name: 'latest duration is 85',
        pass:
          numericMetric(metrics, ['latest', 'duration']) ===
          expected.latestDuration,
      },
      {
        name: 'latest distress is 2',
        pass:
          numericMetric(metrics, ['latest', 'distress']) ===
          expected.latestDistress,
      },
      {
        name: 'threshold is 38/47',
        pass: hasExpectedUnderThreshold(metrics, expected),
      },
      {
        name: 'safe increases is 33',
        pass:
          numericMetric(metrics, ['safe', 'increase']) ===
          expected.safeIncreases,
      },
      {
        name: 'regression count is 3',
        pass:
          numericMetric(metrics, ['regression']) ===
          expected.regressions.length,
      },
      {
        name: 'aggregate trends omitted',
        pass: metricsHaveNoTrend(metrics, durationAggregateMetricTerms),
      },
      {
        name: 'milestone dates present',
        pass: milestoneDateList.every((date) => dates.includes(date)),
      },
      { name: 'milestones newest-first', pass: newestFirst },
      { name: 'milestone evidence present', pass: milestoneEvidence },
      { name: 'source evidence present', pass: sourceEvidence },
    ],
    reason: 'Separation anxiety eval passed',
  });
};

exports.refreshSeparationAnxiety = (output, context) => {
  const payload = parsePayload(output);
  const fixture = readFixture(context);
  const expected = fixture.expected;
  const { chart, metrics, milestones, sourceRecordIds } = cardParts(payload);
  const series = Array.isArray(chart.series) ? chart.series : [];
  const duration = seriesByTerms(series, ['duration']);
  const distress = seriesByTerms(series, ['distress']);

  const { distressFixture, durationFixture } = durationFixtures(
    fixture.records
  );

  const metricLabels = metrics.map((metric) => metric.label);

  return gradingResult({
    checks: [
      { name: 'runs refresh mode', pass: payload.mode === 'refresh' },
      {
        name: 'preserves previous title',
        pass: payload.title === fixture.scenarios.refresh.previousTitle,
      },
      {
        name: 'preserves metric labels',
        pass:
          JSON.stringify(metricLabels) ===
          JSON.stringify(DURATION_METRIC_LABELS),
      },
      { name: 'keeps no milestone section', pass: milestones.length === 0 },
      {
        name: 'returns refreshed line',
        pass: chart.type === 'line' && series.length === 2,
      },
      {
        name: 'uses chart.series only',
        pass: !Array.isArray(chart.data) || chart.data.length === 0,
      },
      {
        name: 'refresh duration matches',
        pass:
          !!duration && sameSeriesData(duration.data ?? [], durationFixture),
      },
      {
        name: 'refresh distress matches',
        pass:
          !!distress && sameSeriesData(distress.data ?? [], distressFixture),
      },
      {
        name: 'refresh duration is 85',
        pass:
          numericMetric(metrics, ['latest', 'duration']) ===
          expected.latestDuration,
      },
      {
        name: 'refresh distress is 2',
        pass:
          numericMetric(metrics, ['latest', 'distress']) ===
          expected.latestDistress,
      },
      {
        name: 'refresh threshold is 38/47',
        pass: hasExpectedUnderThreshold(metrics, expected),
      },
      {
        name: 'refresh safe increases',
        pass:
          numericMetric(metrics, ['safe', 'increase']) ===
          expected.safeIncreases,
      },
      {
        name: 'refresh regression count',
        pass:
          numericMetric(metrics, ['regression']) ===
          expected.regressions.length,
      },
      {
        name: 'refresh trends omitted',
        pass: metricsHaveNoTrend(metrics, durationAggregateMetricTerms),
      },
      {
        name: 'refresh source coverage',
        pass: includesAll(sourceRecordIds, allRecordIds(fixture.records)),
      },
    ],
    reason: 'Refresh eval passed',
  });
};

exports.triggerTweak = (output, context) => {
  const payload = parsePayload(output);
  const fixture = readFixture(context);
  const expected = fixture.expected.trigger;
  const { chart, metrics, milestones, sourceRecordIds } = cardParts(payload);
  const triggerRecords = recordsByDate(fixture.records, expected.dates);

  const triggerData = triggerRecords.map((record) => ({
    label: record.date,
    value: parseSessionValue(record, 'Peak distress \\(0-5\\)'),
  }));

  const milestoneDateList = [
    ...expected.weatherRegressionDates,
    expected.latestRecovery,
  ];

  const milestoneEvidence = milestoneDateList.every((date) => {
    const milestone = milestoneForDate(milestones, date);
    const recordId = recordIdByDate(fixture.records, date);

    return (
      !!milestone &&
      !!recordId &&
      Array.isArray(milestone.recordIds) &&
      milestone.recordIds.includes(recordId)
    );
  });

  const updatedPrompt = normalizeLabel(payload.updatedPrompt);

  return gradingResult({
    checks: [
      { name: 'runs tweak mode', pass: payload.mode === 'tweak' },
      {
        name: 'updates trigger prompt',
        pass:
          updatedPrompt.includes('trigger') ||
          updatedPrompt.includes('noise') ||
          updatedPrompt.includes('resilience'),
      },
      {
        name: 'returns trigger bars',
        pass:
          chart.type === 'bar' &&
          Array.isArray(chart.data) &&
          sameSeriesData(chart.data, triggerData),
      },
      {
        name: 'bar skips series',
        pass: !Array.isArray(chart.series) || chart.series.length === 0,
      },
      {
        name: 'trigger sessions is 9',
        pass: numericMetric(metrics, ['trigger']) === expected.count,
      },
      {
        name: 'average distress is 2.2',
        pass:
          numericMetric(metrics, ['avg', 'distress']) ===
            expected.averageDistress ||
          numericMetric(metrics, ['average', 'distress']) ===
            expected.averageDistress,
      },
      {
        name: 'whine sessions is 3',
        pass: numericMetric(metrics, ['whine']) === expected.whineSessions,
      },
      {
        name: 'bark reports is 0',
        pass: numericMetric(metrics, ['bark']) === expected.barkReports,
      },
      {
        name: 'trigger trends omitted',
        pass: metricsHaveNoTrend(metrics, triggerAggregateMetricTerms),
      },
      {
        name: 'trigger dates present',
        pass: milestoneDateList.every((date) =>
          milestones.some((milestone) => milestone.date === date)
        ),
      },
      { name: 'trigger evidence present', pass: milestoneEvidence },
      {
        name: 'trigger source coverage',
        pass: includesAll(sourceRecordIds, allRecordIds(triggerRecords)),
      },
    ],
    reason: 'Trigger tweak eval passed',
  });
};
