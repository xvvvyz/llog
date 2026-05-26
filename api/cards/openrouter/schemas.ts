import * as cardOutput from '@/domain/cards/output';
import type { JsonSchema } from './types';

const nullableStringSchema = { type: ['string', 'null'] };

const stringSchema = (maxLength: number) =>
  ({ maxLength, type: 'string' }) satisfies JsonSchema;

const nullableLimitedStringSchema = (maxLength: number) =>
  ({ maxLength, type: ['string', 'null'] }) satisfies JsonSchema;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const nullableSchema = (schema: unknown): unknown => {
  if (!isRecord(schema)) return schema;
  const type = schema.type;

  const nullableEnum =
    Array.isArray(schema.enum) && !schema.enum.includes(null)
      ? [...schema.enum, null]
      : undefined;

  const enumSchema = nullableEnum ? { enum: nullableEnum } : {};

  if (Array.isArray(type)) {
    return type.includes('null')
      ? { ...schema, ...enumSchema }
      : { ...schema, ...enumSchema, type: [...type, 'null'] };
  }

  return typeof type === 'string'
    ? { ...schema, ...enumSchema, type: [type, 'null'] }
    : schema;
};

const strictResponseSchema = (schema: unknown): unknown => {
  if (Array.isArray(schema)) return schema.map(strictResponseSchema);
  if (!isRecord(schema)) return schema;
  const next = { ...schema };
  if ('items' in next) next.items = strictResponseSchema(next.items);

  if (isRecord(next.properties)) {
    const required = new Set(
      Array.isArray(next.required)
        ? next.required.filter((key): key is string => typeof key === 'string')
        : []
    );

    const properties = Object.fromEntries(
      Object.entries(next.properties).map(([key, property]) => {
        const strictProperty = strictResponseSchema(property);

        return [
          key,
          required.has(key) ? strictProperty : nullableSchema(strictProperty),
        ];
      })
    );

    next.properties = properties;
    next.required = Object.keys(properties);
  }

  return next;
};

const schemaTypeIncludes = (value: unknown, type: string) =>
  value === type || (Array.isArray(value) && value.includes(type));

const removeNullableContainerType = (value: unknown, type: string) => {
  if (
    !Array.isArray(value) ||
    !value.includes(type) ||
    !value.includes('null')
  ) {
    return value;
  }

  const types = value.filter((item) => item !== 'null');
  return types.length === 1 ? types[0] : types;
};

const nullableGeminiObjectProperty = (schema: unknown): unknown => {
  if (!isRecord(schema)) return schema;

  if (
    schemaTypeIncludes(schema.type, 'object') ||
    schemaTypeIncludes(schema.type, 'array')
  ) {
    return schema;
  }

  return nullableSchema(schema);
};

const geminiResponseSchema = (schema: unknown): unknown => {
  if (Array.isArray(schema)) return schema.map(geminiResponseSchema);
  if (!isRecord(schema)) return schema;
  const type = schema.type;

  const nullableObject =
    Array.isArray(type) && type.includes('object') && type.includes('null');

  const next: Record<string, unknown> = {
    ...schema,
    type: schemaTypeIncludes(type, 'object')
      ? removeNullableContainerType(type, 'object')
      : schemaTypeIncludes(type, 'array')
        ? removeNullableContainerType(type, 'array')
        : type,
  };

  if (
    schemaTypeIncludes(next.type, 'integer') ||
    schemaTypeIncludes(next.type, 'number')
  ) {
    delete next.enum;
  }

  delete next.maxItems;
  delete next.maxLength;
  if ('items' in next) next.items = geminiResponseSchema(next.items);

  if (isRecord(next.properties)) {
    const required = new Set(
      Array.isArray(next.required)
        ? next.required.filter((key): key is string => typeof key === 'string')
        : []
    );

    next.properties = Object.fromEntries(
      Object.entries(next.properties).map(([key, property]) => {
        const geminiProperty = geminiResponseSchema(property);

        return [
          key,
          nullableObject && required.has(key)
            ? nullableGeminiObjectProperty(geminiProperty)
            : geminiProperty,
        ];
      })
    );
  }

  return next;
};

const usesGeminiSchemaProfile = (model: string) =>
  /^(?:google\/)?gemini(?:-|$)/i.test(model);

export const responseJsonSchemaForModel = ({
  model,
  responseSchema,
}: {
  model: string;
  responseSchema: JsonResponseSchema;
}) =>
  usesGeminiSchemaProfile(model)
    ? (geminiResponseSchema(responseSchema.schema) as JsonSchema)
    : responseSchema.schema;

const datumSchema = {
  additionalProperties: false,
  properties: {
    label: stringSchema(cardOutput.MAX_CARD_CHART_DATUM_LABEL_LENGTH),
    value: { type: 'number' },
  },
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
    label: stringSchema(cardOutput.MAX_CARD_CHART_SERIES_LABEL_LENGTH),
    unit: nullableLimitedStringSchema(cardOutput.MAX_CARD_UNIT_LENGTH),
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
    title: nullableLimitedStringSchema(cardOutput.MAX_CARD_CHART_TITLE_LENGTH),
    type: { enum: ['bar', 'line'], type: 'string' },
    unit: nullableLimitedStringSchema(cardOutput.MAX_CARD_UNIT_LENGTH),
    xAxis: xAxisSchema,
    yAxis: yAxisSchema,
  },
  required: ['type'],
  type: 'object',
} satisfies JsonSchema;

const metricSchema = {
  additionalProperties: false,
  properties: {
    label: stringSchema(cardOutput.MAX_CARD_METRIC_LABEL_LENGTH),
    trend: { enum: ['up', 'down', 'flat', null], type: ['string', 'null'] },
    unit: nullableLimitedStringSchema(cardOutput.MAX_CARD_UNIT_LENGTH),
    value: stringSchema(cardOutput.MAX_CARD_METRIC_VALUE_LENGTH),
    valueFormat: {
      enum: [...cardOutput.CARD_METRIC_VALUE_FORMATS, null],
      type: ['string', 'null'],
    },
  },
  required: ['label', 'value'],
  type: 'object',
} satisfies JsonSchema;

const milestoneSchema = {
  additionalProperties: false,
  properties: {
    date: nullableLimitedStringSchema(
      cardOutput.MAX_CARD_MILESTONE_DATE_LENGTH
    ),
    detail: nullableLimitedStringSchema(
      cardOutput.MAX_CARD_MILESTONE_DETAIL_LENGTH
    ),
    title: stringSchema(cardOutput.MAX_CARD_MILESTONE_TITLE_LENGTH),
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
    summary: nullableLimitedStringSchema(
      cardOutput.MAX_CARD_GENERATED_SUMMARY_LENGTH
    ),
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
  schema: strictResponseSchema({
    additionalProperties: false,
    properties,
    required,
    type: 'object',
  }) as JsonSchema,
  strict: true,
});

export type JsonResponseSchema = ReturnType<typeof jsonResponseSchema>;

export const generatedCardResponseSchema = jsonResponseSchema({
  description: 'Generated progress card output.',
  name: 'llog_card_generation',
  properties: {
    title: stringSchema(cardOutput.MAX_CARD_GENERATED_TITLE_LENGTH),
    output: cardOutputSchema,
  },
});

export const refreshedCardResponseSchema = jsonResponseSchema({
  description: 'Refreshed progress card output.',
  name: 'llog_card_refresh',
  properties: { output: cardOutputSchema },
});

export const tweakedCardResponseSchema = jsonResponseSchema({
  description: 'Tweaked progress card output.',
  name: 'llog_card_tweak',
  properties: {
    title: nullableLimitedStringSchema(
      cardOutput.MAX_CARD_GENERATED_TITLE_LENGTH
    ),
    output: cardOutputSchema,
  },
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
        'currentStreak',
        'longestStreak',
        'daysSinceLast',
      ],
      type: 'string',
    },
    outcomeLabel: nullableStringSchema,
    period: {
      enum: ['record', 'day', 'week', 'month', null],
      type: ['string', 'null'],
    },
    qualitativeLabel: nullableStringSchema,
    groupBy: nullableSchema(analysisGroupingSchema),
    threshold: nullableSchema({
      additionalProperties: false,
      properties: {
        operator: { enum: ['<', '<=', '=', '>=', '>'], type: 'string' },
        value: { type: 'number' },
      },
      required: ['operator', 'value'],
      type: 'object',
    }),
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
    analysisSpec: nullableSchema(analysisSpecSchema),
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
