const fs = require('node:fs');
const path = require('node:path');

const parsePayload = (output) => {
  if (typeof output === 'string') return JSON.parse(output);
  return output;
};

const gradingResult = ({ checks, reason }) => {
  const failed = checks.filter((check) => !check.pass);

  return {
    componentResults: checks.map((check) => ({
      pass: check.pass,
      reason: check.name,
      score: check.pass ? 1 : 0,
    })),
    pass: failed.length === 0,
    reason:
      failed.length === 0
        ? reason
        : failed.map((check) => check.name).join('; '),
    score: failed.length === 0 ? 1 : 0,
  };
};

const readFixture = (context) => {
  const fixturePath = context.vars?.fixturePath;

  if (typeof fixturePath !== 'string') {
    throw new Error('fixturePath is required');
  }

  return JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), fixturePath), 'utf8')
  );
};

const chartDataPoints = (chart) => [
  ...(Array.isArray(chart?.data) ? chart.data : []),
  ...(Array.isArray(chart?.series)
    ? chart.series.flatMap((series) =>
        Array.isArray(series.data) ? series.data : []
      )
    : []),
];

const normalizeLabel = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const metricByTerms = (metrics, terms) =>
  metrics.find((metric) => {
    const label = normalizeLabel(metric.label);
    return terms.every((term) => label.includes(term));
  });

const numericMetric = (metrics, terms) => {
  const value = metricByTerms(metrics, terms)?.value;

  return typeof value === 'number'
    ? value
    : Number(String(value ?? '').match(/-?\d+(?:\.\d+)?/)?.[0]);
};

const metricText = (metrics, terms) =>
  String(metricByTerms(metrics, terms)?.value ?? '');

const parseSessionValue = (record, label) => {
  const match = record.text.match(
    new RegExp(`${label}:\\s*(\\d+(?:\\.\\d+)?)`)
  );

  if (!match) throw new Error(`Missing ${label} in ${record.id}`);
  return Number(match[1]);
};

const fixtureSeries = (records, label) =>
  records.map((record) => ({
    label: record.date,
    value: parseSessionValue(record, label),
  }));

const seriesByTerms = (series, terms) =>
  series.find((item) => {
    const label = normalizeLabel(item.label);
    const unit = normalizeLabel(item.unit);
    return terms.every((term) => label.includes(term) || unit.includes(term));
  });

const sameSeriesData = (actual, expected) =>
  actual.length === expected.length &&
  actual.every(
    (datum, index) =>
      datum.label === expected[index].label &&
      datum.value === expected[index].value
  );

const milestoneDates = (milestones) =>
  milestones.map((milestone) => milestone.date).filter(Boolean);

const milestoneForDate = (milestones, date) =>
  milestones.find((milestone) => milestone.date === date);

const recordIdByDate = (records, date) =>
  records.find((record) => record.date === date)?.id;

const recordsByDate = (records, dates) =>
  dates.map((date) => {
    const record = records.find((item) => item.date === date);
    if (!record) throw new Error(`Missing fixture record for ${date}`);
    return record;
  });

const allRecordIds = (records) => records.map((record) => record.id);

const includesAll = (actual, expected) =>
  expected.every((item) => actual.includes(item));

module.exports = {
  allRecordIds,
  chartDataPoints,
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
};
