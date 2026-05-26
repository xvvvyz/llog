import * as cardAnalysis from '@/domain/cards/analysis';
import * as cardOutput from '@/domain/cards/output';
import { describe, expect, test } from 'bun:test';
import * as separationAnxietyFixture from '@/domain/cards/separation-anxiety-fixture';

const records = (count: number) =>
  separationAnxietyFixture
    .separationRecordsForCount(count)
    .map((record) => ({
      ...record,
      tags: [
        {
          id: separationAnxietyFixture.SEPARATION_SESSION_TAG_ID,
          name: 'Session',
        },
      ],
    }));

const qualitativeAnalysisSpec: cardAnalysis.CardAnalysisSpec = {
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

  test('plans streaks', () => {
    const plan = cardAnalysis.planCardAnalysis({
      mode: 'narrative',
      prompt:
        'Track weekly and longest streaks for each user that posts. Include a bar chart with tag counts.',
      totalMatchingRecords: 6,
    });

    expect(plan).toMatchObject({
      analysisSpec: {
        aggregations: [
          {
            groupBy: { dimension: 'author' },
            operation: 'currentStreak',
            period: 'week',
          },
          {
            groupBy: { dimension: 'author' },
            operation: 'longestStreak',
            period: 'week',
          },
          { id: 'record_count', operation: 'count' },
        ],
        charts: [{ id: 'tag_counts', x: { dimension: 'tag' } }],
      },
      mode: 'exact',
    });
  });

  test('plans requested streak operation', () => {
    const plan = cardAnalysis.planCardAnalysis({
      mode: 'narrative',
      prompt: 'Track the longest record streak.',
      totalMatchingRecords: 47,
    });

    expect(plan.analysisSpec?.aggregations).toEqual([
      expect.objectContaining({ operation: 'longestStreak', period: 'record' }),
    ]);
  });

  test('routes conditioned streaks to planner', () => {
    expect(
      cardAnalysis.promptRequestsExactCandidate(
        'Track the longest distress <=2 streak.'
      )
    ).toBe(true);

    expect(
      cardAnalysis.planCardAnalysis({
        mode: 'narrative',
        prompt: 'Track the longest distress <=2 streak.',
        totalMatchingRecords: 47,
      })
    ).toEqual({ mode: 'narrative' });

    expect(
      cardAnalysis.planCardAnalysis({
        mode: 'narrative',
        prompt: 'Track current and longest calm streaks.',
        totalMatchingRecords: 47,
      })
    ).toEqual({ mode: 'narrative' });
  });

  test('skips unscoped streak fallback', () => {
    const plan = cardAnalysis.planCardAnalysis({
      analysisSpec: {
        aggregations: [
          {
            eventLabel: 'calm',
            fieldId: 'calm',
            id: 'longest_calm',
            label: 'Calm streak',
            operation: 'longestStreak',
            period: 'record',
            unit: 'sessions',
          },
        ],
        charts: [],
        extractionFields: [
          {
            countMode: 'recordPresence',
            id: 'calm',
            label: 'Calm',
            type: 'event',
          },
        ],
        groupings: [],
      },
      mode: 'exact',
      prompt: 'Track current and longest calm streaks.',
      totalMatchingRecords: 47,
    });

    expect(plan.analysisSpec?.aggregations).toEqual([
      expect.objectContaining({
        fieldId: 'calm',
        id: 'longest_calm',
        operation: 'longestStreak',
      }),
    ]);
  });

  test('keeps planned streaks', () => {
    const plan = cardAnalysis.planCardAnalysis({
      analysisSpec: {
        aggregations: [
          {
            eventLabel: 'post',
            fieldId: 'post',
            groupBy: { dimension: 'author', id: 'author', label: 'User' },
            id: 'cur_wk',
            label: 'Current weekly posting streak by user',
            operation: 'currentStreak',
            period: 'week',
            unit: 'weeks',
          },
          {
            eventLabel: 'post',
            fieldId: 'post',
            groupBy: { dimension: 'author', id: 'author', label: 'User' },
            id: 'long_wk',
            label: 'Longest weekly posting streak by user',
            operation: 'longestStreak',
            period: 'week',
            unit: 'weeks',
          },
          {
            eventLabel: 'post',
            fieldId: 'post',
            id: 'tag_count',
            label: 'Tag counts',
            operation: 'count',
            unit: 'posts',
          },
        ],
        charts: [
          {
            id: 'tag_counts',
            title: 'Tag counts',
            type: 'bar',
            x: { dimension: 'tag', id: 'tag', label: 'Tag' },
            y: [{ aggregationId: 'tag_count', label: 'Posts' }],
          },
        ],
        extractionFields: [
          {
            countMode: 'recordPresence',
            id: 'post',
            label: 'Post',
            type: 'event',
          },
        ],
        groupings: [
          { dimension: 'author', id: 'author', label: 'User' },
          { dimension: 'tag', id: 'tag', label: 'Tag' },
        ],
      },
      mode: 'exact',
      prompt:
        'Track weekly and longest streaks for each user that posts. Include a bar chart with tag counts.',
      totalMatchingRecords: 6,
    });

    expect(plan.analysisSpec?.aggregations.map((item) => item.id)).toEqual([
      'cur_wk',
      'long_wk',
      'tag_count',
    ]);
  });

  test('normalizes since-last', () => {
    expect(
      cardAnalysis.normalizeAnalysisSpec({
        aggregations: [
          {
            fieldId: 'above',
            id: 'days_since_last',
            label: 'Days since last above-threshold session',
            operation: 'currentStreak',
            period: 'day',
            unit: 'days',
          },
        ],
        charts: [],
        extractionFields: [
          {
            countMode: 'recordPresence',
            id: 'above',
            label: 'Above threshold',
            type: 'event',
          },
        ],
        groupings: [],
      })?.aggregations[0]?.operation
    ).toBe('daysSinceLast');
  });

  test('normalizes thresholds', () => {
    expect(
      cardAnalysis.normalizeAnalysisSpec({
        aggregations: [
          {
            fieldId: 'distress',
            id: 'distress_streak',
            label: 'Distress <=2 streak',
            operation: 'longestStreak',
            period: 'record',
            threshold: { operator: '<=', value: 2 },
          },
        ],
        charts: [],
        extractionFields: [
          { id: 'distress', label: 'Peak distress', type: 'number' },
        ],
        groupings: [],
      })?.aggregations[0]
    ).toMatchObject({ threshold: { operator: '<=', value: 2 } });
  });

  test('skips chart fallback', () => {
    const prompt =
      'Track separation progress: make a line chart over time with two series, Alone duration (min) and Peak distress (0-5). Summarize latest duration, current all-time max with distress <=2, and recent regressions where distress rose above 2 or duration was reduced.';

    expect(cardAnalysis.extractTargetEvents(prompt)).toEqual([]);

    expect(
      cardAnalysis.planCardAnalysis({
        prompt,
        totalMatchingRecords:
          separationAnxietyFixture.separationAnxietyExpected.sessionCount,
      }).mode
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
        totalMatchingRecords:
          separationAnxietyFixture.separationAnxietyExpected.sessionCount,
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
      cardAnalysis
        .chunkRecordIds({
          recordIds: separationAnxietyFixture.separationAnxietyRecords.map(
            (record) => record.id
          ),
        })
        .map((chunk) => chunk.length)
    ).toEqual([20, 20, 7]);
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
    const filters = cardAnalysis.parsePromptDateFilters({
      generationTime: '2026-05-23T12:00:00.000Z',
      prompt: 'Average duration from Feb 1 to Feb 28.',
    });

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
      filters,
      groupings: [],
    };

    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: spec,
      facts: separationAnxietyFixture.separationAnxietyFacts,
      generationTime: '2026-05-23T12:00:00.000Z',
      records: separationAnxietyFixture.separationAnxietyRecords,
      tagIds: separationAnxietyFixture.separationSessionTagIds,
    });

    expect(exactFacts.aggregateValues.duration_average.value).toBe(38.55);
    expect(exactFacts.totalMatchingRecordCount).toBe(20);
  });
});

describe('card fact cache', () => {
  test('counts tags', () => {
    const [first, second, third] = records(3);

    expect(
      cardAnalysis.countSelectedTags({
        records: [
          first,
          second,
          { ...third, tags: [{ id: 'trigger', name: 'Trigger' }] },
        ],
        tagIds: [separationAnxietyFixture.SEPARATION_SESSION_TAG_ID, 'trigger'],
      })
    ).toEqual({ session: 2, trigger: 1 });
  });

  test('fingerprints source', () => {
    const [record] = records(1);

    const original = cardAnalysis.recordFingerprint({
      record,
      selectedTagIds: separationAnxietyFixture.separationSessionTagIds,
    });

    expect(
      cardAnalysis.recordFingerprint({
        record: { ...record, text: 'changed' },
        selectedTagIds: separationAnxietyFixture.separationSessionTagIds,
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
      selectedTagIds: separationAnxietyFixture.separationSessionTagIds,
    });

    const analysisSpecHash = cardAnalysis.analysisSpecHash(
      separationAnxietyFixture.separationAnxietyAnalysisSpec
    );

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
          selectedTagIds: separationAnxietyFixture.separationSessionTagIds,
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
  test('aggregates sessions', () => {
    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: separationAnxietyFixture.separationAnxietyAnalysisSpec,
      facts: separationAnxietyFixture.separationAnxietyFacts,
      records: separationAnxietyFixture.separationAnxietyRecords,
      tagIds: separationAnxietyFixture.separationSessionTagIds,
    });

    expect(exactFacts.totalMatchingRecordCount).toBe(
      separationAnxietyFixture.separationAnxietyExpected.sessionCount
    );

    expect(exactFacts.aggregateValues.latest_duration.value).toBe(
      separationAnxietyFixture.separationAnxietyExpected.latestDuration
    );

    expect(exactFacts.aggregateValues.latest_distress.value).toBe(
      separationAnxietyFixture.separationAnxietyExpected.latestDistress
    );

    expect(exactFacts.aggregateValues.distress_average.value).toBe(2.13);
    expect(exactFacts.aggregateValues.whine_sessions.value).toBe(6);

    expect(exactFacts.chart).toMatchObject({
      series: [
        {
          data: separationAnxietyFixture.separationSeries({
            value: separationAnxietyFixture.separationDuration,
          }),
          label: 'Duration',
          unit: 'min',
        },
        {
          data: separationAnxietyFixture.separationSeries({
            value: separationAnxietyFixture.separationDistress,
          }),
          label: 'Distress',
          unit: '0-5',
        },
      ],
      type: 'line',
    });
  });

  test('labels record charts by date', () => {
    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: {
        aggregations: [
          {
            fieldId: 'duration',
            id: 'duration_latest',
            label: 'Duration',
            operation: 'latest',
            unit: 'min',
          },
          {
            fieldId: 'distress',
            id: 'distress_latest',
            label: 'Distress',
            operation: 'latest',
          },
        ],
        charts: [
          {
            id: 'progress',
            title: 'Progress',
            type: 'line',
            x: { dimension: 'record', id: 'record', label: 'Session date' },
            y: [
              { aggregationId: 'duration_latest', label: 'Duration' },
              { aggregationId: 'distress_latest', label: 'Distress' },
            ],
          },
        ],
        extractionFields: [
          { id: 'duration', label: 'Duration', type: 'number', unit: 'min' },
          { id: 'distress', label: 'Distress', type: 'number' },
        ],
        groupings: [],
      },
      facts: [
        {
          facts: {
            events: [],
            evidence: [],
            numericValues: [
              { fieldId: 'duration', value: 2 },
              { fieldId: 'distress', value: 4 },
            ],
            outcomes: [],
            qualitativeLabels: [],
            recordId: 'record-1',
          },
        },
        {
          facts: {
            events: [],
            evidence: [],
            numericValues: [
              { fieldId: 'duration', value: 6 },
              { fieldId: 'distress', value: 2 },
            ],
            outcomes: [],
            qualitativeLabels: [],
            recordId: 'record-2',
          },
        },
      ],
      records: [
        { date: '2026-01-05T17:00:00.000Z', id: 'record-1' },
        { date: '2026-01-13T17:00:00.000Z', id: 'record-2' },
      ],
      tagIds: [],
    });

    expect(exactFacts.chart?.series?.map((series) => series.data)).toEqual([
      [
        { label: '2026-01-05T17:00:00.000Z', value: 2 },
        { label: '2026-01-13T17:00:00.000Z', value: 6 },
      ],
      [
        { label: '2026-01-05T17:00:00.000Z', value: 4 },
        { label: '2026-01-13T17:00:00.000Z', value: 2 },
      ],
    ]);

    expect(exactFacts.metrics).toEqual([
      { label: 'Duration', trend: 'up', unit: 'min', value: 6 },
      { label: 'Distress', trend: 'down', value: 2 },
    ]);
  });

  test('charts scored latest values', () => {
    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: {
        aggregations: [
          {
            fieldId: 'duration',
            id: 'duration_latest',
            label: 'Duration',
            operation: 'latest',
            unit: 'min',
          },
          {
            fieldId: 'distress',
            id: 'distress_latest',
            label: 'Distress',
            operation: 'latest',
            unit: '0-5',
          },
        ],
        charts: [
          {
            id: 'progress',
            title: 'Progress',
            type: 'line',
            x: { dimension: 'record', id: 'record', label: 'Session date' },
            y: [
              { aggregationId: 'duration_latest', label: 'Duration' },
              { aggregationId: 'distress_latest', label: 'Distress' },
            ],
          },
        ],
        extractionFields: [
          { id: 'duration', label: 'Duration', type: 'number', unit: 'min' },
          {
            id: 'distress',
            label: 'Distress',
            scoreScale: { max: 5, min: 0 },
            type: 'qualitative',
          },
        ],
        groupings: [],
      },
      facts: [
        {
          facts: {
            events: [],
            evidence: [],
            numericValues: [{ fieldId: 'duration', value: 75 }],
            outcomes: [],
            qualitativeLabels: [
              { fieldId: 'distress', label: 'distress', score: 1 },
            ],
            recordId: 'record-1',
          },
        },
        {
          facts: {
            events: [],
            evidence: [],
            numericValues: [{ fieldId: 'duration', value: 85 }],
            outcomes: [],
            qualitativeLabels: [
              { fieldId: 'distress', label: 'distress', score: 2 },
            ],
            recordId: 'record-2',
          },
        },
      ],
      records: [
        { date: '2026-03-09T17:00:00.000Z', id: 'record-1' },
        { date: '2026-03-10T17:00:00.000Z', id: 'record-2' },
      ],
      tagIds: [],
    });

    expect(exactFacts.chart?.series).toEqual([
      {
        data: [
          { label: '2026-03-09T17:00:00.000Z', value: 75 },
          { label: '2026-03-10T17:00:00.000Z', value: 85 },
        ],
        label: 'Duration',
        unit: 'min',
      },
      {
        data: [
          { label: '2026-03-09T17:00:00.000Z', value: 1 },
          { label: '2026-03-10T17:00:00.000Z', value: 2 },
        ],
        label: 'Distress',
        unit: '0-5',
      },
    ]);

    expect(exactFacts.metrics).toEqual([
      { label: 'Duration', trend: 'up', unit: 'min', value: 85 },
      { label: 'Distress', trend: 'up', unit: '0-5', value: 2 },
    ]);
  });

  test('aggregates since-last', () => {
    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: {
        aggregations: [
          {
            eventLabel: 'Above threshold session peak distress 3',
            fieldId: 'above',
            id: 'above_count',
            label: 'Above threshold sessions',
            operation: 'count',
            unit: 'sessions',
          },
          {
            eventLabel: 'Above threshold session peak distress 3',
            fieldId: 'above',
            id: 'days_since_above',
            label: 'Days since last above threshold',
            operation: 'daysSinceLast',
            unit: 'days',
          },
        ],
        charts: [
          {
            id: 'above_by_month',
            title: 'Above threshold by month',
            type: 'bar',
            x: { dimension: 'month', id: 'month' },
            y: [{ aggregationId: 'above_count', label: 'Sessions' }],
          },
        ],
        extractionFields: [
          {
            countMode: 'recordPresence',
            id: 'above',
            label: 'Above threshold',
            type: 'event',
          },
        ],
        groupings: [{ dimension: 'month', id: 'month' }],
      },
      facts: [
        {
          facts: {
            events: [
              {
                count: 1,
                fieldId: 'above',
                label: 'above threshold session tag and peak distress 3',
              },
            ],
            evidence: [],
            numericValues: [],
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
                fieldId: 'above',
                label: 'above threshold session tag and peak distress 3',
              },
            ],
            evidence: [],
            numericValues: [],
            outcomes: [],
            qualitativeLabels: [],
            recordId: 'record-2',
          },
        },
      ],
      generationTime: '2026-05-24T19:04:46.000Z',
      records: [
        { date: '2026-01-05T17:00:00.000Z', id: 'record-1' },
        { date: '2026-02-23T17:00:00.000Z', id: 'record-2' },
        { date: '2026-03-02T17:00:00.000Z', id: 'record-3' },
      ],
      tagIds: [],
    });

    expect(exactFacts.aggregateValues.days_since_above.value).toBe(
      '2026-02-23T17:00:00.000Z'
    );

    expect(exactFacts.aggregateValues.days_since_above.valueFormat).toBe(
      'durationSince'
    );

    expect(exactFacts.metrics).toContainEqual({
      label: 'Days since last above threshold',
      unit: 'days',
      value: '2026-02-23T17:00:00.000Z',
      valueFormat: 'durationSince',
    });

    expect(exactFacts.chart?.data).toEqual([
      { label: '2026-01', value: 1 },
      { label: '2026-02', value: 1 },
      { label: '2026-03', value: 0 },
    ]);
  });

  test('labels threshold since-last', () => {
    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: {
        aggregations: [
          {
            fieldId: 'peak',
            id: 'days_since_high',
            label: 'Days since last Peak distress >=3 session',
            operation: 'daysSinceLast',
            threshold: { operator: '>=', value: 3 },
            unit: 'days',
          },
        ],
        charts: [],
        extractionFields: [
          { id: 'peak', label: 'Peak distress', type: 'number', unit: '0-5' },
        ],
        groupings: [],
      },
      facts: [
        {
          facts: {
            events: [],
            evidence: [],
            numericValues: [
              { fieldId: 'peak', label: 'Peak distress', value: 3 },
            ],
            outcomes: [],
            qualitativeLabels: [],
            recordId: 'record-1',
          },
        },
        {
          facts: {
            events: [],
            evidence: [],
            numericValues: [
              { fieldId: 'peak', label: 'Peak distress', value: 2 },
            ],
            outcomes: [],
            qualitativeLabels: [],
            recordId: 'record-2',
          },
        },
      ],
      records: [
        { date: '2026-02-23T17:00:00.000Z', id: 'record-1' },
        { date: '2026-03-10T17:00:00.000Z', id: 'record-2' },
      ],
      tagIds: [],
    });

    expect(exactFacts.metrics).toContainEqual({
      label: 'Since last peak distress >=3',
      unit: 'days',
      value: '2026-02-23T17:00:00.000Z',
      valueFormat: 'durationSince',
    });
  });

  test('aggregates qualitative', () => {
    const sourceRecords = records(2);

    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: qualitativeAnalysisSpec,
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
            recordId: sourceRecords[0].id,
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
            recordId: sourceRecords[1].id,
          },
        },
      ],
      records: sourceRecords,
      tagIds: separationAnxietyFixture.separationSessionTagIds,
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
      recordId: sourceRecords[0].id,
    });
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

  test('counts streaks', () => {
    const plan = cardAnalysis.planCardAnalysis({
      prompt:
        'Track weekly and longest streaks for each user that posts. Include a bar chart with tag counts.',
      totalMatchingRecords: 6,
    });

    if (!plan.analysisSpec) throw new Error('Expected analysis spec');

    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: plan.analysisSpec,
      facts: [],
      generationTime: '2026-05-24T04:00:00.000Z',
      records: [
        {
          author: { id: 'profile-n', name: 'Normandy' },
          date: '2026-04-28T20:43:38.227Z',
          id: 'record-1',
          tags: [{ id: 'tag-discover', name: 'Discover Weekly' }],
        },
        {
          author: { id: 'profile-c', name: 'cade' },
          date: '2026-04-28T23:13:41.940Z',
          id: 'record-2',
          tags: [{ id: 'tag-practice', name: 'Finger Practice' }],
        },
        {
          author: { id: 'profile-n', name: 'Normandy' },
          date: '2026-05-05T04:56:18.621Z',
          id: 'record-3',
          tags: [{ id: 'tag-discover', name: 'Discover Weekly' }],
        },
        {
          author: { id: 'profile-c', name: 'cade' },
          date: '2026-05-14T18:21:24.837Z',
          id: 'record-4',
          tags: [{ id: 'tag-original', name: 'Original Clip' }],
        },
        {
          author: { id: 'profile-n', name: 'Normandy' },
          date: '2026-05-15T19:34:16.501Z',
          id: 'record-5',
          tags: [{ id: 'tag-discover', name: 'Discover Weekly' }],
        },
        {
          author: { id: 'profile-c', name: 'cade' },
          date: '2026-05-22T22:53:15.570Z',
          id: 'record-6',
          tags: [{ id: 'tag-original', name: 'Original Clip' }],
        },
      ],
      tagIds: ['tag-discover', 'tag-practice', 'tag-original'],
    });

    expect(
      Object.fromEntries(
        exactFacts.aggregateValues.current_week_by_author.groups?.map(
          (group) => [group.label, group.value]
        ) ?? []
      )
    ).toEqual({ cade: 2, Normandy: 0 });

    expect(
      Object.fromEntries(
        exactFacts.aggregateValues.longest_week_by_author.groups?.map(
          (group) => [group.label, group.value]
        ) ?? []
      )
    ).toEqual({ Normandy: 3, cade: 2 });

    expect(exactFacts.aggregateValues.current_week_by_author.value).toBe(2);
    expect(exactFacts.aggregateValues.longest_week_by_author.value).toBe(3);

    expect(exactFacts.metrics.map((metric) => metric.label)).not.toContain(
      'Current weekly streak'
    );

    expect(exactFacts.metrics.map((metric) => metric.label)).not.toContain(
      'Longest weekly streak'
    );
  });

  test('counts record streaks', () => {
    const records = separationAnxietyFixture.separationAnxietyRecords;

    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: {
        aggregations: [
          {
            fieldId: 'distress',
            id: 'longest_under_threshold',
            label: 'Distress <=2 streak',
            operation: 'longestStreak',
            period: 'record',
            threshold: { operator: '<=', value: 2 },
            unit: 'sessions',
          },
        ],
        charts: [],
        extractionFields: [
          { id: 'distress', label: 'Peak distress', type: 'number' },
        ],
        groupings: [],
      },
      facts: separationAnxietyFixture.separationAnxietyFacts,
      records,
      tagIds: separationAnxietyFixture.separationSessionTagIds,
    });

    const longest = exactFacts.aggregateValues.longest_under_threshold;
    expect(longest).toMatchObject({ unit: 'sessions', value: 14 });
    expect(longest.recordIds).toHaveLength(14);

    expect(longest.recordIds.at(0)).toBe(
      '44f57021-4b66-4951-817e-2230008e03e2'
    );

    expect(longest.recordIds.at(-1)).toBe(
      '3c8caf81-a7e0-432a-bb5c-b440c9b78c68'
    );

    expect(exactFacts.metrics).toContainEqual({
      label: 'Longest distress <=2 streak',
      unit: 'sessions',
      value: 14,
    });
  });

  test('breaks record streaks', () => {
    const matchingRecordIds = new Set([
      'record-1',
      'record-2',
      'record-4',
      'record-5',
    ]);

    const sourceRecords = Array.from({ length: 6 }, (_, index) => ({
      date: `2026-01-0${index + 1}T17:00:00.000Z`,
      id: `record-${index + 1}`,
    }));

    const facts = sourceRecords.map((record) => ({
      facts: {
        events: matchingRecordIds.has(record.id)
          ? [{ count: 1, fieldId: 'calm', label: 'calm' }]
          : [],
        evidence: [],
        numericValues: [],
        outcomes: [],
        qualitativeLabels: [],
        recordId: record.id,
      },
    }));

    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: {
        aggregations: [
          {
            eventLabel: 'calm',
            fieldId: 'calm',
            id: 'current_calm',
            label: 'Calm streak',
            operation: 'currentStreak',
            period: 'record',
            unit: 'sessions',
          },
          {
            eventLabel: 'calm',
            fieldId: 'calm',
            id: 'longest_calm',
            label: 'Calm streak',
            operation: 'longestStreak',
            period: 'record',
            unit: 'sessions',
          },
        ],
        charts: [],
        extractionFields: [
          {
            countMode: 'recordPresence',
            id: 'calm',
            label: 'Calm',
            type: 'event',
          },
        ],
        groupings: [],
      },
      facts,
      records: sourceRecords,
      tagIds: [],
    });

    expect(exactFacts.aggregateValues.current_calm).toMatchObject({
      recordIds: [],
      value: 0,
    });

    expect(exactFacts.aggregateValues.longest_calm).toMatchObject({
      recordIds: ['record-1', 'record-2'],
      value: 2,
    });

    expect(exactFacts.metrics).toContainEqual({
      label: 'Current calm streak',
      unit: 'sessions',
      value: 0,
    });

    expect(exactFacts.metrics).toContainEqual({
      label: 'Longest calm streak',
      unit: 'sessions',
      value: 2,
    });
  });

  test('evals threshold streak plan', () => {
    const prompt = 'Track the longest distress <=2 streak.';

    const plan = cardAnalysis.planCardAnalysis({
      analysisSpec: {
        aggregations: [
          {
            fieldId: 'distress',
            id: 'longest_distress_under_threshold',
            label: 'Longest streak',
            operation: 'longestStreak',
            period: 'record',
            threshold: { operator: '<=', value: 2 },
            unit: 'sessions',
          },
        ],
        charts: [],
        extractionFields: [
          {
            id: 'distress',
            label: 'Peak distress',
            type: 'number',
            unit: '0-5',
          },
        ],
        groupings: [],
      },
      mode: 'exact',
      prompt,
      totalMatchingRecords:
        separationAnxietyFixture.separationAnxietyRecords.length,
    });

    if (!plan.analysisSpec) throw new Error('Expected analysis spec');

    expect(plan.analysisSpec.aggregations).toEqual([
      expect.objectContaining({
        fieldId: 'distress',
        operation: 'longestStreak',
        period: 'record',
        threshold: { operator: '<=', value: 2 },
      }),
    ]);

    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: plan.analysisSpec,
      facts: separationAnxietyFixture.separationAnxietyFacts,
      records: separationAnxietyFixture.separationAnxietyRecords,
      tagIds: separationAnxietyFixture.separationSessionTagIds,
    });

    expect(
      exactFacts.aggregateValues.longest_distress_under_threshold
    ).toMatchObject({ unit: 'sessions', value: 14 });

    expect(exactFacts.metrics).toContainEqual({
      label: 'Longest distress <=2 streak',
      unit: 'sessions',
      value: 14,
    });
  });

  test('filters invalid facts', () => {
    const [record] = records(1);

    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: qualitativeAnalysisSpec,
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
            recordId: record.id,
          },
        },
      ],
      records: [record],
      tagIds: separationAnxietyFixture.separationSessionTagIds,
    });

    expect(exactFacts.aggregateValues.whining_count.value).toBe(0);
    expect(exactFacts.qualitative?.themeCounts).toEqual({ settled: 1 });
    expect(exactFacts.qualitative?.ordinalScores).toEqual([]);
  });

  test('normalizes metrics', () => {
    const [record] = records(1);

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
            recordId: record.id,
          },
        },
      ],
      records: [record],
      tagIds: separationAnxietyFixture.separationSessionTagIds,
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
