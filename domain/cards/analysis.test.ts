import * as cardAnalysis from '@/domain/cards/analysis';
import * as cardOutput from '@/domain/cards/output';
import { describe, expect, test } from 'bun:test';

const records = (count: number) =>
  Array.from({ length: count }, (_item, index) => ({
    date: `2026-05-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    id: `record-${index + 1}`,
    isDraft: false,
    logId: 'log-1',
    tags: [{ id: 'tag-a', name: 'Session' }],
    text: `Session ${index + 1}`,
  }));

const analysisSpec: cardAnalysis.CardAnalysisSpec = {
  aggregations: [
    {
      eventLabel: 'whining',
      fieldId: 'events',
      id: 'whining_count',
      label: 'Whining',
      operation: 'count',
    },
    {
      fieldId: 'duration',
      id: 'duration_sum',
      label: 'Total duration',
      operation: 'sum',
      unit: 'min',
    },
    {
      fieldId: 'duration',
      id: 'duration_average',
      label: 'Average duration',
      operation: 'average',
      unit: 'min',
    },
    {
      denominatorId: 'duration_sum',
      id: 'whines_per_minute',
      label: 'Whines per minute',
      numeratorId: 'whining_count',
      operation: 'ratio',
    },
  ],
  charts: [
    {
      id: 'duration_by_day',
      title: 'Duration by day',
      type: 'line',
      x: { dimension: 'day', id: 'day' },
      y: [{ aggregationId: 'duration_sum', label: 'Duration', unit: 'min' }],
    },
  ],
  extractionFields: [
    {
      countMode: 'explicitOccurrences',
      id: 'events',
      label: 'Events',
      labels: ['whining'],
      type: 'event',
    },
    { id: 'duration', label: 'Duration', type: 'number', unit: 'min' },
    {
      id: 'themes',
      label: 'Themes',
      labels: ['settled', 'anxious'],
      scoreScale: { max: 5, min: 1 },
      type: 'qualitative',
    },
    {
      id: 'outcomes',
      label: 'Outcomes',
      labels: ['improved'],
      type: 'outcome',
    },
  ],
  groupings: [{ dimension: 'day', id: 'day', label: 'Day' }],
};

describe('card analysis plan', () => {
  test('plans narrative', () => {
    expect(
      cardAnalysis.planCardAnalysis({
        prompt: 'Summarize recent sleep patterns.',
        totalMatchingRecords: 120,
      }).mode
    ).toBe('narrative');
  });

  test('plans exact', () => {
    const plan = cardAnalysis.planCardAnalysis({
      prompt: 'Count whining, barking, pacing, and settling.',
      totalMatchingRecords: 47,
    });

    expect(plan.mode).toBe('exact');

    expect(plan.analysisSpec?.extractionFields[0]).toMatchObject({
      countMode: 'explicitOccurrences',
      id: 'events',
      labels: ['whining', 'barking', 'pacing', 'settling'],
      type: 'event',
    });

    expect(typeof plan.analysisSpecHash).toBe('string');
  });

  test('plans tag counts', () => {
    const plan = cardAnalysis.planCardAnalysis({
      mode: 'narrative',
      prompt: 'Can you chart tag counts.',
      totalMatchingRecords: 501,
    });

    expect(plan.mode).toBe('exact');

    expect(plan.analysisSpec).toMatchObject({
      aggregations: [{ id: 'record_count', operation: 'count' }],
      charts: [
        {
          id: 'tag_counts',
          type: 'bar',
          x: { dimension: 'tag', id: 'tag' },
          y: [{ aggregationId: 'record_count' }],
        },
      ],
    });
  });

  test('plans author counts', () => {
    const plan = cardAnalysis.planCardAnalysis({
      mode: 'narrative',
      prompt: 'Count records by author.',
      totalMatchingRecords: 80,
    });

    expect(plan).toMatchObject({
      analysisSpec: {
        charts: [{ id: 'author_counts', x: { dimension: 'author' } }],
      },
      mode: 'exact',
    });
  });

  test('skips chart fallback', () => {
    const prompt =
      'Track separation progress: make a line chart over time with two series, Alone duration (min) and Peak distress (0-5). Summarize latest duration, current all-time max with distress <=2, and any recent regressions where distress rose above 2 or duration was reduced.';

    expect(cardAnalysis.extractTargetEvents(prompt)).toEqual([]);

    expect(
      cardAnalysis.planCardAnalysis({ prompt, totalMatchingRecords: 47 }).mode
    ).toBe('narrative');

    expect(
      cardAnalysis.planCardAnalysis({
        analysisSpec: {
          aggregations: [
            {
              eventLabel: 'alone duration (min)',
              fieldId: 'events',
              id: 'alone_duration_min_count',
              label: 'alone duration (min)',
              operation: 'count',
            },
          ],
          charts: [
            {
              id: 'event_counts',
              title: 'Event counts',
              type: 'bar',
              x: { dimension: 'event', id: 'event' },
              y: [{ aggregationId: 'alone_duration_min_count' }],
            },
          ],
          extractionFields: [
            {
              countMode: 'explicitOccurrences',
              id: 'events',
              label: 'Events',
              labels: ['alone duration (min)'],
              type: 'event',
            },
          ],
          groupings: [{ dimension: 'event', id: 'event' }],
        },
        mode: 'exact',
        prompt,
        totalMatchingRecords: 47,
      }).mode
    ).toBe('narrative');
  });

  test('plans qualitative exact', () => {
    expect(
      cardAnalysis.planCardAnalysis({
        prompt: 'Create a structured qualitative aggregation of themes.',
        totalMatchingRecords: 47,
      }).mode
    ).toBe('exact');
  });

  test('downgrades exact', () => {
    expect(
      cardAnalysis.planCardAnalysis({
        mode: 'narrative',
        prompt: 'Compare how bedtime felt this month.',
        totalMatchingRecords: 47,
      }).mode
    ).toBe('narrative');
  });

  test('normalizes score scale', () => {
    const plan = cardAnalysis.planCardAnalysis({
      analysisSpec: {
        aggregations: [],
        charts: [],
        extractionFields: [
          {
            id: 'themes',
            label: 'Themes',
            labels: ['calm'],
            scoreScale: { highLabel: 'high', max: 10, min: 0 },
            type: 'qualitative',
          },
        ],
        groupings: [],
      },
      mode: 'exact',
      prompt: 'Create a structured qualitative aggregation of themes.',
      totalMatchingRecords: 47,
    });

    expect(plan.analysisSpec?.extractionFields[0]?.scoreScale).toEqual({
      highLabel: 'high',
      max: 10,
      min: 0,
    });
  });

  test('orders score scale', () => {
    const plan = cardAnalysis.planCardAnalysis({
      analysisSpec: {
        aggregations: [],
        charts: [],
        extractionFields: [
          {
            id: 'confidence',
            label: 'Confidence',
            scoreScale: { max: 0, min: 10 },
            type: 'qualitative',
          },
        ],
        groupings: [],
      },
      mode: 'exact',
      prompt: 'Create a structured qualitative aggregation of confidence.',
      totalMatchingRecords: 47,
    });

    expect(plan.analysisSpec?.extractionFields[0]?.scoreScale).toEqual({
      max: 10,
      min: 0,
    });
  });

  test('drops flat score scale', () => {
    const plan = cardAnalysis.planCardAnalysis({
      analysisSpec: {
        aggregations: [],
        charts: [],
        extractionFields: [
          {
            id: 'confidence',
            label: 'Confidence',
            scoreScale: { max: 5, min: 5 },
            type: 'qualitative',
          },
        ],
        groupings: [],
      },
      mode: 'exact',
      prompt: 'Create a structured qualitative aggregation of confidence.',
      totalMatchingRecords: 47,
    });

    expect(plan.analysisSpec?.extractionFields[0]?.scoreScale).toBeUndefined();
  });

  test('remaps spec refs', () => {
    const plan = cardAnalysis.planCardAnalysis({
      analysisSpec: {
        aggregations: [
          {
            fieldId: 'Duration Minutes',
            id: 'Total Duration',
            label: 'Total duration',
            operation: 'sum',
          },
        ],
        charts: [
          {
            id: 'Duration Chart',
            title: 'Duration chart',
            type: 'line',
            x: { dimension: 'day', id: 'Day Bucket' },
            y: [{ aggregationId: 'Total Duration' }],
          },
        ],
        extractionFields: [
          {
            id: 'Duration Minutes',
            label: 'Duration',
            type: 'number',
            unit: 'minutes',
          },
        ],
        groupings: [],
      },
      mode: 'exact',
      prompt: 'Chart total duration by day.',
      totalMatchingRecords: 47,
    });

    expect(plan.analysisSpec?.extractionFields[0]?.id).toBe('duration_minutes');

    expect(plan.analysisSpec?.aggregations[0]).toMatchObject({
      fieldId: 'duration_minutes',
      id: 'total_duration',
    });

    expect(plan.analysisSpec?.charts[0]?.y[0]?.aggregationId).toBe(
      'total_duration'
    );
  });

  test('chunks records', () => {
    expect(
      cardAnalysis.chunkRecordIds({ recordIds: records(20).map((r) => r.id) })
    ).toHaveLength(1);

    expect(
      cardAnalysis.chunkRecordIds({ recordIds: records(21).map((r) => r.id) })
    ).toHaveLength(2);

    expect(
      cardAnalysis.chunkRecordIds({ recordIds: records(40).map((r) => r.id) })
    ).toHaveLength(2);

    expect(
      cardAnalysis.chunkRecordIds({ recordIds: records(60).map((r) => r.id) })
    ).toHaveLength(3);

    expect(
      cardAnalysis.chunkRecordIds({ recordIds: records(61).map((r) => r.id) })
    ).toHaveLength(4);
  });
});

describe('card date filters', () => {
  const emptySpec = {
    aggregations: [],
    charts: [],
    extractionFields: [],
    groupings: [],
  };

  test('normalizes filters', () => {
    const spec = cardAnalysis.normalizeAnalysisSpec({
      ...emptySpec,
      filters: [
        {
          endExclusive: { type: 'iso', value: '2026-05-01' },
          field: 'record.date',
          id: 'April',
          label: 'April',
          startInclusive: { type: 'iso', value: '2026-04-01' },
        },
        {
          field: 'record.text',
          id: 'bad-field',
          startInclusive: { type: 'iso', value: '2026-04-01' },
        },
        {
          field: 'record.date',
          id: 'bad-date',
          startInclusive: { type: 'iso', value: 'April 1' },
        },
      ],
    });

    expect(spec?.filters).toEqual([
      {
        endExclusive: { type: 'iso', value: '2026-05-01' },
        field: 'record.date',
        id: 'april',
        label: 'April',
        startInclusive: { type: 'iso', value: '2026-04-01' },
      },
    ]);
  });

  test('resolves rolling', () => {
    const [filter] = cardAnalysis.resolveAnalysisDateFilters({
      analysisSpec: {
        ...emptySpec,
        filters: [
          {
            endExclusive: { type: 'generationTime' },
            field: 'record.date',
            id: 'last_3_months',
            startInclusive: {
              offset: { amount: -3, unit: 'month' },
              type: 'generationTime',
            },
          },
        ],
      },
      generationTime: '2026-05-23T12:00:00.000Z',
    });

    expect(filter).toMatchObject({
      endExclusive: '2026-05-23T12:00:00.000Z',
      startInclusive: '2026-02-23T12:00:00.000Z',
    });
  });

  test('parses fixed range', () => {
    const filters = cardAnalysis.parsePromptDateFilters({
      generationTime: '2026-05-23T12:00:00.000Z',
      prompt: 'Average duration from Feb 1 to Apr 30.',
    });

    expect(
      cardAnalysis.resolveAnalysisDateFilters({
        analysisSpec: { ...emptySpec, filters },
        generationTime: '2026-05-23T12:00:00.000Z',
      })[0]
    ).toMatchObject({
      endExclusive: '2026-05-01T00:00:00.000Z',
      startInclusive: '2026-02-01T00:00:00.000Z',
    });
  });

  test('parses calendar month', () => {
    const filters = cardAnalysis.parsePromptDateFilters({
      generationTime: '2026-05-23T12:00:00.000Z',
      prompt: 'Average duration in April.',
    });

    expect(
      cardAnalysis.resolveAnalysisDateFilters({
        analysisSpec: { ...emptySpec, filters },
        generationTime: '2026-05-23T12:00:00.000Z',
      })[0]
    ).toMatchObject({
      endExclusive: '2026-05-01T00:00:00.000Z',
      startInclusive: '2026-04-01T00:00:00.000Z',
    });
  });

  test('filters records', () => {
    const filters = cardAnalysis.parsePromptDateFilters({
      generationTime: '2026-05-23T12:00:00.000Z',
      prompt: 'Average duration from Feb 1 to Apr 30.',
    });

    expect(
      cardAnalysis
        .selectExactRecords(
          [
            { date: '2026-01-31T23:59:59.000Z', id: 'before' },
            { date: '2026-02-01T00:00:00.000Z', id: 'start' },
            { date: '2026-04-30T23:59:59.000Z', id: 'end-day' },
            { date: '2026-05-01T00:00:00.000Z', id: 'after' },
            { date: 'invalid', id: 'invalid' },
            { id: 'missing' },
          ],
          {
            analysisSpec: { ...emptySpec, filters },
            generationTime: '2026-05-23T12:00:00.000Z',
          }
        )
        .map((record) => record.id)
    ).toEqual(['start', 'end-day']);
  });

  test('averages filtered records', () => {
    const spec: cardAnalysis.CardAnalysisSpec = {
      aggregations: [
        {
          fieldId: 'duration',
          id: 'duration_average',
          label: 'Average duration',
          operation: 'average',
          unit: 'min',
        },
      ],
      charts: [],
      extractionFields: [
        { id: 'duration', label: 'Duration', type: 'number', unit: 'min' },
      ],
      filters: [
        {
          endExclusive: { type: 'generationTime' },
          field: 'record.date',
          id: 'last_3_months',
          startInclusive: {
            offset: { amount: -3, unit: 'month' },
            type: 'generationTime',
          },
        },
      ],
      groupings: [],
    };

    const sourceRecords = [
      { date: '2026-02-23T11:59:59.000Z', id: 'before' },
      { date: '2026-02-23T12:00:00.000Z', id: 'start' },
      { date: '2026-04-01T00:00:00.000Z', id: 'middle' },
      { date: '2026-05-23T11:59:59.000Z', id: 'latest' },
      { date: '2026-05-23T12:00:00.000Z', id: 'after' },
    ];

    const facts = sourceRecords.map((record, index) => ({
      facts: {
        events: [],
        evidence: [],
        numericValues: [
          { fieldId: 'duration', value: [100, 10, 20, 30, 1000][index] },
        ],
        outcomes: [],
        qualitativeLabels: [],
        recordId: record.id,
      },
    }));

    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: spec,
      facts,
      generationTime: '2026-05-23T12:00:00.000Z',
      records: sourceRecords,
      tagIds: ['tag-a'],
    });

    expect(exactFacts.aggregateValues.duration_average.value).toBe(20);
    expect(exactFacts.totalMatchingRecordCount).toBe(3);
  });
});

describe('card fact cache', () => {
  test('counts tags', () => {
    expect(
      cardAnalysis.countSelectedTags({
        records: [
          ...records(2),
          {
            ...records(1)[0],
            id: 'record-3',
            tags: [{ id: 'tag-b', name: 'Trigger' }],
          },
        ],
        tagIds: ['tag-a', 'tag-b'],
      })
    ).toEqual({ 'tag-a': 2, 'tag-b': 1 });
  });

  test('fingerprints source', () => {
    const [record] = records(1);

    const original = cardAnalysis.recordFingerprint({
      record,
      selectedTagIds: ['tag-a'],
    });

    expect(
      cardAnalysis.recordFingerprint({
        record: { ...record, text: 'changed' },
        selectedTagIds: ['tag-a'],
      })
    ).not.toBe(original);

    expect(
      cardAnalysis.recordFingerprint({
        record: { ...record, tags: [{ id: 'tag-b', name: 'Other' }] },
        selectedTagIds: ['tag-b'],
      })
    ).not.toBe(original);
  });

  test('reuses keys', () => {
    const [record] = records(1);

    const recordFingerprint = cardAnalysis.recordFingerprint({
      record,
      selectedTagIds: ['tag-a'],
    });

    const analysisSpecHash = cardAnalysis.analysisSpecHash(analysisSpec);

    expect(
      cardAnalysis.factKey({
        analysisSpecHash,
        cardId: 'card-1',
        recordFingerprint,
        recordId: record.id,
      })
    ).toBe(
      cardAnalysis.factKey({
        analysisSpecHash,
        cardId: 'card-1',
        recordFingerprint,
        recordId: record.id,
      })
    );

    expect(
      cardAnalysis.factKey({
        analysisSpecHash,
        cardId: 'card-1',
        recordFingerprint: cardAnalysis.recordFingerprint({
          record: { ...record, text: 'changed' },
          selectedTagIds: ['tag-a'],
        }),
        recordId: record.id,
      })
    ).not.toBe(
      cardAnalysis.factKey({
        analysisSpecHash,
        cardId: 'card-1',
        recordFingerprint,
        recordId: record.id,
      })
    );

    expect(
      cardAnalysis.factKey({
        analysisSpecHash,
        cardId: 'card-2',
        recordFingerprint,
        recordId: record.id,
      })
    ).not.toBe(
      cardAnalysis.factKey({
        analysisSpecHash,
        cardId: 'card-1',
        recordFingerprint,
        recordId: record.id,
      })
    );
  });
});

describe('card exact facts', () => {
  test('aggregates metrics', () => {
    const sourceRecords = records(2);

    const facts = [
      {
        facts: {
          events: [
            {
              count: 2,
              evidence: 'Whined twice.',
              fieldId: 'events',
              label: 'whining',
            },
          ],
          evidence: [],
          numericValues: [
            {
              evidence: 'Duration was 10 minutes.',
              fieldId: 'duration',
              value: 10,
            },
          ],
          outcomes: [],
          qualitativeLabels: [],
          recordId: 'record-1',
        },
      },
      {
        facts: {
          events: [
            {
              count: 1,
              evidence: 'Whined once.',
              fieldId: 'events',
              label: 'whining',
            },
          ],
          evidence: [],
          numericValues: [
            {
              evidence: 'Duration was 20 minutes.',
              fieldId: 'duration',
              value: 20,
            },
          ],
          outcomes: [],
          qualitativeLabels: [],
          recordId: 'record-2',
        },
      },
    ];

    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec,
      facts,
      records: sourceRecords,
      tagIds: ['tag-a'],
    });

    expect(exactFacts.aggregateValues.whining_count.value).toBe(3);
    expect(exactFacts.aggregateValues.duration_sum.value).toBe(30);
    expect(exactFacts.aggregateValues.duration_average.value).toBe(15);
    expect(exactFacts.aggregateValues.whines_per_minute.value).toBe(0.1);

    expect(exactFacts.chart).toMatchObject({
      data: [
        { label: '2026-05-01T00:00:00.000Z', value: 10 },
        { label: '2026-05-02T00:00:00.000Z', value: 20 },
      ],
      type: 'line',
    });
  });

  test('aggregates qualitative', () => {
    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec,
      facts: [
        {
          facts: {
            events: [],
            evidence: [],
            numericValues: [],
            outcomes: [{ fieldId: 'outcomes', label: 'improved' }],
            qualitativeLabels: [
              {
                evidence: 'Settled near the door.',
                fieldId: 'themes',
                label: 'settled',
                score: 4,
              },
              {
                evidence: 'Anxious pacing.',
                fieldId: 'themes',
                label: 'anxious',
                score: 2,
              },
            ],
            recordId: 'record-1',
          },
        },
        {
          facts: {
            events: [],
            evidence: [],
            numericValues: [],
            outcomes: [{ fieldId: 'outcomes', label: 'improved' }],
            qualitativeLabels: [
              {
                evidence: 'Settled quickly.',
                fieldId: 'themes',
                label: 'settled',
                score: 5,
              },
            ],
            recordId: 'record-2',
          },
        },
      ],
      records: records(2),
      tagIds: ['tag-a'],
    });

    expect(exactFacts.qualitative?.themeCounts).toEqual({
      anxious: 1,
      settled: 2,
    });

    expect(exactFacts.qualitative?.outcomeCounts).toEqual({ improved: 2 });

    expect(exactFacts.qualitative?.ordinalScores).toContainEqual({
      average: 4.5,
      count: 2,
      label: 'settled',
    });

    expect(exactFacts.qualitative?.representativeRecords[0]).toMatchObject({
      evidence: 'Settled near the door.',
      label: 'settled',
      recordId: 'record-1',
    });
  });

  test('counts record presence', () => {
    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: {
        aggregations: [
          {
            eventLabel: 'whining',
            fieldId: 'events',
            id: 'whine_sessions',
            label: 'Whine sessions',
            operation: 'count',
          },
        ],
        charts: [],
        extractionFields: [
          {
            countMode: 'recordPresence',
            id: 'events',
            label: 'Events',
            labels: ['whining'],
            type: 'event',
          },
        ],
        groupings: [],
      },
      facts: [
        {
          facts: {
            events: [
              {
                count: 3,
                evidence: 'Whined three times.',
                fieldId: 'events',
                label: 'whining',
              },
            ],
            evidence: [],
            numericValues: [],
            outcomes: [],
            qualitativeLabels: [],
            recordId: 'record-1',
          },
        },
      ],
      records: records(2),
      tagIds: ['tag-a'],
    });

    expect(exactFacts.aggregateValues.whine_sessions.value).toBe(1);
  });

  test('counts tags', () => {
    const plan = cardAnalysis.planCardAnalysis({
      prompt: 'Can you chart tag counts.',
      totalMatchingRecords: 4,
    });

    if (!plan.analysisSpec) throw new Error('Expected analysis spec');

    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: plan.analysisSpec,
      facts: [],
      records: [
        { id: 'record-1', tags: [{ id: 'tag-a', name: 'Alpha' }] },
        {
          id: 'record-2',
          tags: [
            { id: 'tag-a', name: 'Alpha' },
            { id: 'tag-b', name: 'Beta' },
          ],
        },
        { id: 'record-3', tags: [{ id: 'tag-b', name: 'Beta' }] },
        { id: 'record-4', tags: [{ id: 'tag-c', name: 'Ignored' }] },
      ],
      tagIds: ['tag-a', 'tag-b'],
    });

    expect(exactFacts.aggregateValues.record_count.value).toBe(4);
    expect(exactFacts.selectedTagCounts).toEqual({ 'tag-a': 2, 'tag-b': 2 });

    expect(
      Object.fromEntries(
        exactFacts.chart?.data?.map((item) => [item.label, item.value]) ?? []
      )
    ).toEqual({ Alpha: 2, Beta: 2 });
  });

  test('counts authors', () => {
    const plan = cardAnalysis.planCardAnalysis({
      prompt: 'Count records by author.',
      totalMatchingRecords: 4,
    });

    if (!plan.analysisSpec) throw new Error('Expected analysis spec');

    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: plan.analysisSpec,
      facts: [],
      records: [
        { author: { id: 'profile-a', name: 'Ada' }, id: 'record-1' },
        { author: { id: 'profile-b', name: 'Bea' }, id: 'record-2' },
        { author: { id: 'profile-a', name: 'Ada' }, id: 'record-3' },
        { author: { id: 'profile-c', name: 'Cal' }, id: 'record-4' },
      ],
      tagIds: ['tag-a'],
    });

    expect(
      Object.fromEntries(
        exactFacts.chart?.data?.map((item) => [item.label, item.value]) ?? []
      )
    ).toEqual({ Ada: 2, Bea: 1, Cal: 1 });
  });

  test('filters invalid facts', () => {
    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec,
      facts: [
        {
          facts: {
            events: [
              {
                count: 1,
                evidence: 'Barked.',
                fieldId: 'unknown',
                label: 'barking',
              },
            ],
            evidence: [],
            numericValues: [
              { evidence: 'Unknown value.', fieldId: 'unknown', value: 100 },
            ],
            outcomes: [],
            qualitativeLabels: [
              {
                evidence: 'Settled.',
                fieldId: 'themes',
                label: 'settled',
                score: 8,
              },
            ],
            recordId: 'record-1',
          },
        },
      ],
      records: records(1),
      tagIds: ['tag-a'],
    });

    expect(exactFacts.aggregateValues.whining_count.value).toBe(0);
    expect(exactFacts.qualitative?.themeCounts).toEqual({ settled: 1 });
    expect(exactFacts.qualitative?.ordinalScores).toEqual([]);
  });

  test('normalizes metrics', () => {
    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: {
        aggregations: [
          {
            fieldId: 'themes',
            id: 'latest_theme',
            label:
              'Latest settled qualitative theme value that exceeds metric limits',
            operation: 'latest',
          },
        ],
        charts: [],
        extractionFields: [
          { id: 'themes', label: 'Themes', type: 'qualitative' },
        ],
        groupings: [],
      },
      facts: [
        {
          facts: {
            events: [],
            evidence: [],
            numericValues: [],
            outcomes: [],
            qualitativeLabels: [
              {
                fieldId: 'themes',
                label: 'settled',
                value:
                  'A long qualitative value that should be trimmed before validation',
              },
            ],
            recordId: 'record-1',
          },
        },
      ],
      records: records(1),
      tagIds: ['tag-a'],
    });

    const [metric] = exactFacts.metrics;
    expect(metric?.label.length).toBeLessThanOrEqual(40);
    expect(String(metric?.value).length).toBeLessThanOrEqual(40);

    expect(
      cardOutput.validateCardOutput({
        metrics: exactFacts.metrics,
        milestones: [],
      }).success
    ).toBe(true);
  });
});
