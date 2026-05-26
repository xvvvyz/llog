import type * as cardAnalysis from '@/domain/cards/analysis';
import type { CardOutput } from '@/domain/cards/output';
import fixture from '@/evals/cards/fixtures/separation-anxiety-sessions.json';

export const SEPARATION_SESSION_TAG_ID = 'session';

export const SEPARATION_ANXIETY_PROMPT = `Create a separation-anxiety progress card from the Session records.

Return a two-series line chart over every Session record using chart.series only, with no chart.data. The series must be named Duration and Distress. Duration uses minutes, Distress uses the 0-5 scale, and each point must use the source record full ISO date as the chart label.

Return metrics with exactly these labels: Latest duration, Latest distress, Under threshold, Safe increases, and Regressions. Under threshold means peak distress 0-2, and its value must be a count/total string such as "38/47", not only the count. Safe increases means duration increased from the previous Session while peak distress stayed 0-2. Regressions means contextual setbacks above threshold after the initial setup period, not the early baseline ramp.

Return milestones for: latest high-water mark, first hour, first subthreshold duration increase, and each contextual regression. Keep milestones newest-first.`;

const tagId = (name: string | undefined, index: number) =>
  name
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `tag-${index + 1}`;

export const separationAnxietyFixture = fixture;

export const separationAnxietyExpected = fixture.expected;

export const separationAnxietyRecords: cardAnalysis.CardSourceFactRecord[] =
  fixture.records.map((record) => ({
    date: record.date,
    id: record.id,
    logId: 'separation-anxiety',
    status: 'published',
    tags: record.tags.map((tag, index) => ({
      id: tagId(tag.name, index),
      name: tag.name,
    })),
    text: record.text,
  }));

export const separationSessionTagIds = [SEPARATION_SESSION_TAG_ID];

const sessionValue = (
  record: Pick<cardAnalysis.CardSourceFactRecord, 'id' | 'text'>,
  label: string
) => {
  const match = (record.text ?? '').match(
    new RegExp(`${label}:\\s*(\\d+(?:\\.\\d+)?)`)
  );

  if (!match) throw new Error(`Missing ${label} in ${record.id}`);
  return Number(match[1]);
};

export const separationDuration = (
  record: Pick<cardAnalysis.CardSourceFactRecord, 'id' | 'text'>
) => sessionValue(record, 'Alone duration \\(min\\)');

export const separationDistress = (
  record: Pick<cardAnalysis.CardSourceFactRecord, 'id' | 'text'>
) => sessionValue(record, 'Peak distress \\(0-5\\)');

export const separationSeries = ({
  records = separationAnxietyRecords,
  value,
}: {
  records?: cardAnalysis.CardSourceFactRecord[];
  value: (record: cardAnalysis.CardSourceFactRecord) => number;
}) =>
  records.map((record) => ({
    label: String(record.date),
    value: value(record),
  }));

export const separationSafeIncreaseCount = (
  records: cardAnalysis.CardSourceFactRecord[] = separationAnxietyRecords
) =>
  records.slice(1).filter((record, index) => {
    const previous = records[index];

    return (
      separationDuration(record) > separationDuration(previous) &&
      separationDistress(record) <= 2
    );
  }).length;

const hasWhine = (record: cardAnalysis.CardSourceFactRecord) =>
  /\bwhin(?:e|ed|es|ing)\b/i.test(record.text ?? '');

export const separationAnxietyFacts: cardAnalysis.CardFactRecord[] =
  separationAnxietyRecords.map((record) => ({
    facts: {
      events: hasWhine(record)
        ? [
            {
              count: 1,
              evidence: record.text ?? undefined,
              fieldId: 'events',
              label: 'whine',
            },
          ]
        : [],
      evidence: [],
      numericValues: [
        {
          evidence: record.text ?? undefined,
          fieldId: 'duration',
          label: 'Alone duration',
          unit: 'min',
          value: separationDuration(record),
        },
        {
          evidence: record.text ?? undefined,
          fieldId: 'distress',
          label: 'Peak distress',
          unit: '0-5',
          value: separationDistress(record),
        },
      ],
      outcomes: [],
      qualitativeLabels: [],
      recordId: record.id,
    } satisfies cardAnalysis.ExtractedRecordFacts,
  }));

export const separationAnxietyAnalysisSpec: cardAnalysis.CardAnalysisSpec = {
  aggregations: [
    {
      fieldId: 'duration',
      id: 'latest_duration',
      label: 'Latest duration',
      operation: 'latest',
      unit: 'min',
    },
    {
      fieldId: 'distress',
      id: 'latest_distress',
      label: 'Latest distress',
      operation: 'latest',
      unit: '0-5',
    },
    {
      fieldId: 'distress',
      id: 'distress_average',
      label: 'Average distress',
      operation: 'average',
      unit: '0-5',
    },
    {
      eventLabel: 'whine',
      fieldId: 'events',
      id: 'whine_sessions',
      label: 'Whine sessions',
      operation: 'count',
    },
  ],
  charts: [
    {
      id: 'duration_distress_by_day',
      title: 'Duration and distress',
      type: 'line',
      x: { dimension: 'day', id: 'day', label: 'Day' },
      y: [
        { aggregationId: 'latest_duration', label: 'Duration', unit: 'min' },
        { aggregationId: 'latest_distress', label: 'Distress', unit: '0-5' },
      ],
    },
  ],
  extractionFields: [
    { id: 'duration', label: 'Alone duration', type: 'number', unit: 'min' },
    { id: 'distress', label: 'Peak distress', type: 'number', unit: '0-5' },
    {
      countMode: 'recordPresence',
      id: 'events',
      label: 'Events',
      labels: ['whine'],
      type: 'event',
    },
  ],
  groupings: [{ dimension: 'day', id: 'day', label: 'Day' }],
};

const milestoneDates = [
  separationAnxietyExpected.latestHighWaterMark,
  separationAnxietyExpected.firstHour,
  separationAnxietyExpected.firstSubthresholdIncrease,
  ...separationAnxietyExpected.regressions,
];

export const separationAnxietyOutput = (
  records: cardAnalysis.CardSourceFactRecord[] = separationAnxietyRecords
): CardOutput => {
  const latest = records.at(-1);
  if (!latest) throw new Error('Separation anxiety records are required');

  const milestones = milestoneDates
    .map((date) => ({
      date,
      detail: 'Session marker from the eval fixture.',
      title:
        date === separationAnxietyExpected.latestHighWaterMark
          ? 'Latest high water mark'
          : date === separationAnxietyExpected.firstHour
            ? 'First hour'
            : date === separationAnxietyExpected.firstSubthresholdIncrease
              ? 'First subthreshold increase'
              : 'Contextual regression',
    }))
    .sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime()
    );

  return {
    chart: {
      series: [
        {
          data: separationSeries({ records, value: separationDuration }),
          label: 'Duration',
          unit: 'min',
        },
        {
          data: separationSeries({ records, value: separationDistress }),
          label: 'Distress',
          unit: '0-5',
        },
      ],
      title: 'Duration and distress',
      type: 'line',
      xAxis: { labelMode: 'sparse' },
      yAxis: { decimals: 0, tickCount: 5 },
    },
    metrics: [
      {
        label: 'Latest duration',
        trend: 'up',
        unit: 'min',
        value: separationDuration(latest),
      },
      {
        label: 'Latest distress',
        trend: 'down',
        unit: '0-5',
        value: separationDistress(latest),
      },
      {
        label: 'Under threshold',
        value: `${records.filter((record) => separationDistress(record) <= 2).length}/${records.length}`,
      },
      {
        label: 'Safe increases',
        unit: 'sessions',
        value: separationSafeIncreaseCount(records),
      },
      {
        label: 'Regressions',
        unit: 'sessions',
        value: separationAnxietyExpected.regressions.length,
      },
    ],
    milestones,
    summary: `Sessions reached ${separationDuration(latest)} minutes with peak distress ${separationDistress(latest)}.`,
  };
};

export const separationRecordsForCount = (
  count: number
): cardAnalysis.CardSourceFactRecord[] =>
  Array.from({ length: count }, (_item, index) => {
    const source =
      separationAnxietyRecords[index % separationAnxietyRecords.length];

    const date = new Date(separationAnxietyRecords[0]?.date ?? 0);
    date.setUTCDate(date.getUTCDate() + index);
    return { ...source, date: date.toISOString(), id: `session-${index + 1}` };
  });
