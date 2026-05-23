import * as cardOutput from '@/domain/cards/output';
import type { JsonSchema } from './types';

const nullableStringSchema = { type: ['string', 'null'] };

const datumSchema = {
  additionalProperties: false,
  properties: { label: { type: 'string' }, value: { type: 'number' } },
  required: ['label', 'value'],
  type: 'object',
} satisfies JsonSchema;

const xAxisSchema = {
  additionalProperties: false,
  properties: {
    labelMode: {
      enum: ['auto', 'all', 'sparse', null],
      type: ['string', 'null'],
    },
  },
  type: 'object',
} satisfies JsonSchema;

const yAxisSchema = {
  additionalProperties: false,
  properties: {
    decimals: { enum: [0, 1, 2, null], type: ['integer', 'null'] },
    tickCount: { enum: [3, 4, 5, 6, null], type: ['integer', 'null'] },
  },
  type: 'object',
} satisfies JsonSchema;

const chartSeriesSchema = {
  additionalProperties: false,
  properties: {
    data: {
      items: datumSchema,
      maxItems: cardOutput.MAX_CARD_CHART_POINTS,
      type: 'array',
    },
    label: { type: 'string' },
    unit: nullableStringSchema,
  },
  required: ['label', 'data'],
  type: 'object',
} satisfies JsonSchema;

const chartSchema = {
  additionalProperties: false,
  properties: {
    data: {
      items: datumSchema,
      maxItems: cardOutput.MAX_CARD_CHART_POINTS,
      type: 'array',
    },
    series: {
      items: chartSeriesSchema,
      maxItems: cardOutput.MAX_CARD_CHART_SERIES,
      type: 'array',
    },
    title: nullableStringSchema,
    type: { enum: ['bar', 'line'], type: 'string' },
    unit: nullableStringSchema,
    xAxis: xAxisSchema,
    yAxis: yAxisSchema,
  },
  required: ['type'],
  type: 'object',
} satisfies JsonSchema;

const metricSchema = {
  additionalProperties: false,
  properties: {
    label: { type: 'string' },
    trend: { enum: ['up', 'down', 'flat', null], type: ['string', 'null'] },
    unit: nullableStringSchema,
    value: { type: 'string' },
    valueFormat: { enum: ['date', 'datetime', null], type: ['string', 'null'] },
  },
  required: ['label', 'value'],
  type: 'object',
} satisfies JsonSchema;

const milestoneSchema = {
  additionalProperties: false,
  properties: {
    date: nullableStringSchema,
    detail: nullableStringSchema,
    title: { type: 'string' },
  },
  required: ['title'],
  type: 'object',
} satisfies JsonSchema;

const cardOutputSchema = {
  additionalProperties: false,
  properties: {
    chart: chartSchema,
    metrics: {
      items: metricSchema,
      maxItems: cardOutput.MAX_CARD_METRICS,
      type: 'array',
    },
    milestones: {
      items: milestoneSchema,
      maxItems: cardOutput.MAX_CARD_MILESTONES,
      type: 'array',
    },
    summary: nullableStringSchema,
  },
  type: 'object',
} satisfies JsonSchema;

const jsonResponseSchema = ({
  description,
  name,
  properties,
  required = Object.keys(properties),
}: {
  description: string;
  name: string;
  properties: Record<string, unknown>;
  required?: string[];
}) => ({
  description,
  name,
  schema: { additionalProperties: false, properties, required, type: 'object' },
  strict: true,
});

export type JsonResponseSchema = ReturnType<typeof jsonResponseSchema>;

export const generatedCardResponseSchema = jsonResponseSchema({
  description: 'Generated progress card output.',
  name: 'llog_card_generation',
  properties: { title: { type: 'string' }, output: cardOutputSchema },
});

export const refreshedCardResponseSchema = jsonResponseSchema({
  description: 'Refreshed progress card output.',
  name: 'llog_card_refresh',
  properties: { output: cardOutputSchema },
});

export const tweakedCardResponseSchema = jsonResponseSchema({
  description: 'Tweaked progress card output.',
  name: 'llog_card_tweak',
  properties: { title: nullableStringSchema, output: cardOutputSchema },
  required: ['output'],
});

export const promptSuggestionResponseSchema = jsonResponseSchema({
  description: 'Suggested editable progress card prompt.',
  name: 'llog_card_prompt_suggestion',
  properties: { prompt: { type: 'string' } },
});

const analysisRangeSchema = {
  additionalProperties: false,
  properties: {
    end: nullableStringSchema,
    label: { type: 'string' },
    start: nullableStringSchema,
  },
  required: ['label'],
  type: 'object',
} satisfies JsonSchema;

const analysisGroupingSchema = {
  additionalProperties: false,
  properties: {
    dimension: {
      enum: [
        'record',
        'tag',
        'author',
        'event',
        'day',
        'week',
        'month',
        'range',
      ],
      type: 'string',
    },
    id: { type: 'string' },
    label: nullableStringSchema,
    ranges: { items: analysisRangeSchema, maxItems: 12, type: 'array' },
  },
  required: ['id', 'dimension'],
  type: 'object',
} satisfies JsonSchema;

const analysisExtractionFieldSchema = {
  additionalProperties: false,
  properties: {
    countMode: {
      enum: ['explicitOccurrences', 'recordPresence', null],
      type: ['string', 'null'],
    },
    id: { type: 'string' },
    label: { type: 'string' },
    labels: { items: { type: 'string' }, maxItems: 24, type: 'array' },
    scoreScale: {
      additionalProperties: false,
      properties: {
        highLabel: nullableStringSchema,
        lowLabel: nullableStringSchema,
        max: { type: 'number' },
        min: { type: 'number' },
      },
      required: ['min', 'max'],
      type: 'object',
    },
    type: {
      enum: ['number', 'event', 'qualitative', 'outcome', 'evidence'],
      type: 'string',
    },
    unit: nullableStringSchema,
  },
  required: ['id', 'label', 'type'],
  type: 'object',
} satisfies JsonSchema;

const analysisAggregationSchema = {
  additionalProperties: false,
  properties: {
    denominatorId: nullableStringSchema,
    eventLabel: nullableStringSchema,
    fieldId: nullableStringSchema,
    id: { type: 'string' },
    label: { type: 'string' },
    numeratorId: nullableStringSchema,
    operation: {
      enum: [
        'count',
        'sum',
        'average',
        'min',
        'max',
        'latest',
        'first',
        'ratio',
      ],
      type: 'string',
    },
    outcomeLabel: nullableStringSchema,
    qualitativeLabel: nullableStringSchema,
    unit: nullableStringSchema,
  },
  required: ['id', 'label', 'operation'],
  type: 'object',
} satisfies JsonSchema;

const analysisChartMeasureSchema = {
  additionalProperties: false,
  properties: {
    aggregationId: { type: 'string' },
    label: nullableStringSchema,
    unit: nullableStringSchema,
  },
  required: ['aggregationId'],
  type: 'object',
} satisfies JsonSchema;

const analysisChartSchema = {
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    title: nullableStringSchema,
    type: { enum: ['bar', 'line'], type: 'string' },
    x: analysisGroupingSchema,
    y: {
      items: analysisChartMeasureSchema,
      maxItems: cardOutput.MAX_CARD_CHART_SERIES,
      type: 'array',
    },
  },
  required: ['id', 'type', 'x', 'y'],
  type: 'object',
} satisfies JsonSchema;

const dateBoundSchema = {
  additionalProperties: false,
  properties: {
    offset: {
      additionalProperties: false,
      properties: {
        amount: { type: 'integer' },
        unit: { enum: ['day', 'week', 'month', 'year'], type: 'string' },
      },
      required: ['amount', 'unit'],
      type: 'object',
    },
    type: { enum: ['iso', 'generationTime'], type: 'string' },
    value: nullableStringSchema,
  },
  required: ['type'],
  type: 'object',
} satisfies JsonSchema;

const analysisFilterSchema = {
  additionalProperties: false,
  properties: {
    endExclusive: dateBoundSchema,
    field: { enum: ['record.date'], type: 'string' },
    id: { type: 'string' },
    label: nullableStringSchema,
    startInclusive: dateBoundSchema,
  },
  required: ['id', 'field'],
  type: 'object',
} satisfies JsonSchema;

const analysisSpecSchema = {
  additionalProperties: false,
  properties: {
    aggregations: {
      items: analysisAggregationSchema,
      maxItems: 24,
      type: 'array',
    },
    charts: { items: analysisChartSchema, maxItems: 4, type: 'array' },
    extractionFields: {
      items: analysisExtractionFieldSchema,
      maxItems: 16,
      type: 'array',
    },
    filters: { items: analysisFilterSchema, maxItems: 8, type: 'array' },
    groupings: { items: analysisGroupingSchema, maxItems: 8, type: 'array' },
  },
  required: ['extractionFields', 'aggregations', 'groupings', 'charts'],
  type: 'object',
} satisfies JsonSchema;

export const analysisPlanResponseSchema = jsonResponseSchema({
  description: 'Planned deterministic progress card analysis.',
  name: 'llog_card_analysis_plan',
  properties: {
    analysisSpec: analysisSpecSchema,
    mode: { enum: ['exact', 'narrative'], type: 'string' },
    rationale: nullableStringSchema,
  },
  required: ['analysisSpec', 'mode'],
});

const extractedEventCountSchema = {
  additionalProperties: false,
  properties: {
    count: { minimum: 0, type: 'integer' },
    evidence: { type: 'string' },
    fieldId: { type: 'string' },
    label: { type: 'string' },
  },
  required: ['fieldId', 'label', 'count', 'evidence'],
  type: 'object',
} satisfies JsonSchema;

const extractedNumberSchema = {
  additionalProperties: false,
  properties: {
    evidence: { type: 'string' },
    fieldId: { type: 'string' },
    label: nullableStringSchema,
    unit: nullableStringSchema,
    value: { type: 'number' },
  },
  required: ['fieldId', 'value', 'evidence'],
  type: 'object',
} satisfies JsonSchema;

const extractedQualitativeSchema = {
  additionalProperties: false,
  properties: {
    evidence: { type: 'string' },
    fieldId: { type: 'string' },
    label: { type: 'string' },
    score: { type: ['number', 'null'] },
    value: nullableStringSchema,
  },
  required: ['fieldId', 'label', 'evidence'],
  type: 'object',
} satisfies JsonSchema;

const extractedEvidenceSchema = {
  additionalProperties: false,
  properties: { fieldId: nullableStringSchema, text: { type: 'string' } },
  required: ['text'],
  type: 'object',
} satisfies JsonSchema;

const extractedRecordFactsSchema = {
  additionalProperties: false,
  properties: {
    events: { items: extractedEventCountSchema, type: 'array' },
    evidence: { items: extractedEvidenceSchema, type: 'array' },
    numericValues: { items: extractedNumberSchema, type: 'array' },
    outcomes: { items: extractedQualitativeSchema, type: 'array' },
    qualitativeLabels: { items: extractedQualitativeSchema, type: 'array' },
    recordIndex: { minimum: 1, type: 'integer' },
  },
  required: [
    'recordIndex',
    'numericValues',
    'events',
    'qualitativeLabels',
    'outcomes',
    'evidence',
  ],
  type: 'object',
} satisfies JsonSchema;

export const extractedFactsResponseSchema = jsonResponseSchema({
  description: 'Extracted exact record facts for progress card analysis.',
  name: 'llog_card_record_facts',
  properties: { records: { items: extractedRecordFactsSchema, type: 'array' } },
});
