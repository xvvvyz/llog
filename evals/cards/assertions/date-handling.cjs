const {
  gradingResult,
  includesAll,
  parsePayload,
  readFixture,
} = require('./helpers.cjs');

const { isIsoDateTimeWithZone } = require('./date.cjs');

const HUMAN_DATE_PATTERN =
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b/i;

const DATE_ONLY_TOKEN_PATTERN = /\b\d{4}-\d{2}-\d{2}\b(?!T)/;

exports.dateHandling = (output, context) => {
  const payload = parsePayload(output);
  const fixture = readFixture(context);
  const expected = fixture.expected?.dateHandling ?? {};
  const card = payload.output ?? {};
  const metrics = Array.isArray(card.metrics) ? card.metrics : [];

  const sourceRecordIds = Array.isArray(card.sourceRecordIds)
    ? card.sourceRecordIds
    : [];

  const summary = String(card.summary ?? '');

  const firstDateMetric = metrics.find(
    (metric) => metric.value === expected.firstDate
  );

  const latestTimeMetric = metrics.find(
    (metric) => metric.value === expected.latestDateTime
  );

  return gradingResult({
    checks: [
      {
        name: 'first date metric uses source iso',
        pass:
          firstDateMetric?.value === expected.firstDate &&
          isIsoDateTimeWithZone(firstDateMetric.value),
      },
      {
        name: 'first date metric marks date display',
        pass: firstDateMetric?.valueFormat === 'date',
      },
      {
        name: 'latest time metric uses source iso',
        pass:
          latestTimeMetric?.value === expected.latestDateTime &&
          isIsoDateTimeWithZone(latestTimeMetric.value),
      },
      {
        name: 'latest time metric marks datetime display',
        pass: latestTimeMetric?.valueFormat === 'datetime',
      },
      {
        name: 'summary keeps exact date as iso token',
        pass: summary.includes(expected.latestDateTime),
      },
      {
        name: 'summary avoids human formatted dates',
        pass:
          !HUMAN_DATE_PATTERN.test(summary) &&
          !DATE_ONLY_TOKEN_PATTERN.test(summary),
      },
      {
        name: 'date sources present',
        pass: includesAll(sourceRecordIds, expected.sourceRecordIds ?? []),
      },
    ],
    reason: 'Date handling passed',
  });
};
