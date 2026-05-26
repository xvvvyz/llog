import * as cardOutput from '@/domain/cards/output';
import * as cardSourceAssembly from '@/domain/cards/source-assembly';
import * as cardSourceSelection from '@/domain/cards/source-selection';
import type { AnalysisDateFilter } from '@/domain/cards/analysis-date-filters';
import type { Profile, Record as LlogRecord, Tag } from '@/instant.entities';
import { z } from 'zod/v4';
import * as analysisDateFilters from '@/domain/cards/analysis-date-filters';

export {
  filterRecordsByAnalysisDate,
  parsePromptDateFilters,
  resolveAnalysisDateFilters,
} from '@/domain/cards/analysis-date-filters';

export type {
  AnalysisDateFilter,
  DateBound,
  ResolvedAnalysisDateFilter,
} from '@/domain/cards/analysis-date-filters';

export const CARD_ANALYSIS_VERSION = 4;

export const CARD_EXACT_ANALYSIS_CHUNK_SIZE = 20;

export type CardAnalysisMode = 'exact' | 'narrative';

const EXTRACTION_FIELD_TYPES = [
  'number',
  'event',
  'qualitative',
  'outcome',
  'evidence',
] as const;

const AGGREGATION_OPERATIONS = [
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
] as const;

const EVENT_COUNT_MODES = ['explicitOccurrences', 'recordPresence'] as const;
const STREAK_PERIODS = ['day', 'week', 'month'] as const;
type StreakPeriod = (typeof STREAK_PERIODS)[number];

const GROUPING_DIMENSIONS = [
  'record',
  'tag',
  'author',
  'event',
  'day',
  'week',
  'month',
  'range',
] as const;

const qualitativeScoreScaleSchema = z
  .object({
    highLabel: z.string().min(1).max(40).optional(),
    lowLabel: z.string().min(1).max(40).optional(),
    max: z.number(),
    min: z.number(),
  })
  .strict();

const analysisRangeSchema = z
  .object({
    end: z.string().optional(),
    label: z.string().min(1).max(40),
    start: z.string().optional(),
  })
  .strict();

const analysisGroupingSchema = z
  .object({
    dimension: z.enum(GROUPING_DIMENSIONS),
    id: z.string().min(1).max(48),
    label: z.string().min(1).max(60).optional(),
    ranges: z.array(analysisRangeSchema).max(12).optional(),
  })
  .strict();

const analysisExtractionFieldSchema = z
  .object({
    countMode: z.enum(EVENT_COUNT_MODES).optional(),
    id: z.string().min(1).max(48),
    labels: z.array(z.string().min(1).max(60)).max(24).optional(),
    label: z.string().min(1).max(60),
    scoreScale: qualitativeScoreScaleSchema.optional(),
    type: z.enum(EXTRACTION_FIELD_TYPES),
    unit: z.string().min(1).max(16).optional(),
  })
  .strict();

const analysisAggregationSchema = z
  .object({
    denominatorId: z.string().min(1).max(48).optional(),
    eventLabel: z.string().min(1).max(60).optional(),
    fieldId: z.string().min(1).max(48).optional(),
    groupBy: analysisGroupingSchema.nullish(),
    id: z.string().min(1).max(48),
    label: z.string().min(1).max(60),
    operation: z.enum(AGGREGATION_OPERATIONS),
    outcomeLabel: z.string().min(1).max(60).optional(),
    period: z.enum(STREAK_PERIODS).optional(),
    qualitativeLabel: z.string().min(1).max(60).optional(),
    numeratorId: z.string().min(1).max(48).optional(),
    unit: z.string().min(1).max(16).optional(),
  })
  .strict();

const analysisChartMeasureSchema = z
  .object({
    aggregationId: z.string().min(1).max(48),
    label: z.string().min(1).max(60).optional(),
    unit: z.string().min(1).max(16).optional(),
  })
  .strict();

const analysisChartSchema = z
  .object({
    id: z.string().min(1).max(48),
    title: z.string().min(1).max(80).optional(),
    type: z.enum(['bar', 'line']),
    x: analysisGroupingSchema,
    y: z.array(analysisChartMeasureSchema).min(1).max(4),
  })
  .strict();

export const cardAnalysisSpecSchema = z
  .object({
    aggregations: z.array(analysisAggregationSchema).max(24).default([]),
    charts: z.array(analysisChartSchema).max(4).default([]),
    extractionFields: z
      .array(analysisExtractionFieldSchema)
      .max(16)
      .default([]),
    filters: z.array(z.unknown()).max(8).optional().default([]),
    groupings: z.array(analysisGroupingSchema).max(8).default([]),
  })
  .strict();

export type CardAnalysisSpec = Omit<
  z.infer<typeof cardAnalysisSpecSchema>,
  'filters'
> & { filters?: AnalysisDateFilter[] };

export type AnalysisAggregationSpec = CardAnalysisSpec['aggregations'][number];

export type AnalysisChartSpec = CardAnalysisSpec['charts'][number];

export type AnalysisExtractionField =
  CardAnalysisSpec['extractionFields'][number];

export type AnalysisGroupingSpec = CardAnalysisSpec['groupings'][number];

export type EventCountMode = (typeof EVENT_COUNT_MODES)[number];

export type CardAnalysisPlan = {
  analysisSpec?: CardAnalysisSpec;
  analysisSpecHash?: string;
  mode: CardAnalysisMode;
};

export type CardFactRecord = { facts?: unknown };

export type CardSourceFactRecord = Pick<LlogRecord, 'id'> &
  Partial<Pick<LlogRecord, 'date' | 'logId' | 'status' | 'text'>> & {
    author?: (Pick<Profile, 'name'> & Partial<Pick<Profile, 'id'>>) | null;
    sourceAssemblyVersion?: string;
    tags?: (Pick<Tag, 'id'> & Partial<Pick<Tag, 'name'>>)[];
  };

export type ExtractedNumberFact = {
  evidence?: string;
  fieldId: string;
  label?: string;
  unit?: string;
  value: number;
};

export type ExtractedEventFact = {
  count: number;
  evidence?: string;
  fieldId: string;
  label: string;
};

export type ExtractedQualitativeFact = {
  evidence?: string;
  fieldId: string;
  label: string;
  score?: number;
  value?: string;
};

export type ExtractedEvidenceFact = { fieldId?: string; text: string };

export type ExtractedRecordFacts = {
  events: ExtractedEventFact[];
  evidence: ExtractedEvidenceFact[];
  numericValues: ExtractedNumberFact[];
  outcomes: ExtractedQualitativeFact[];
  qualitativeLabels: ExtractedQualitativeFact[];
  recordId: string;
};

export type DeterministicAggregateValue = {
  groups?: { label: string; recordIds: string[]; value: number | string }[];
  id: string;
  label: string;
  operation: AnalysisAggregationSpec['operation'];
  recordIds: string[];
  unit?: string;
  value: number | string;
  valueFormat?: cardOutput.CardMetricValueFormat;
};

export type QualitativeAggregateFacts = {
  coOccurrences: { count: number; labels: [string, string] }[];
  ordinalScores: { average: number; count: number; label: string }[];
  outcomeCounts: Record<string, number>;
  representativeRecords: {
    evidence?: string;
    label: string;
    recordId: string;
  }[];
  themeCounts: Record<string, number>;
};

export type ExactCardFacts = {
  aggregateValues: Record<string, DeterministicAggregateValue>;
  analysisSpec: CardAnalysisSpec;
  chart?: cardOutput.CardChart;
  eventCounts?: Record<string, number>;
  metrics: cardOutput.CardOutput['metrics'];
  qualitative?: QualitativeAggregateFacts;
  selectedTagCounts: Record<string, number>;
  totalMatchingRecordCount: number;
};

const EXACT_PROMPT_PATTERNS = [
  /\baverage\b/i,
  /\bchart(s|ed|ing)?\b/i,
  /\bcompare\b/i,
  /\bcount(s|ed|ing)?\b/i,
  /\bdistribution\b/i,
  /\bexact(ly)?\b/i,
  /\bfrequency\b/i,
  /\bgraph(s|ed|ing)?\b/i,
  /\bhow many\b/i,
  /\blatest\b/i,
  /\bline chart\b/i,
  /\bmax(imum)?\b/i,
  /\bmin(imum)?\b/i,
  /\bnumber of\b/i,
  /\boutcome(s)?\b.*\b(count|counts|frequency|trend|breakdown|by)\b/i,
  /\bper (day|week|month|tag|record)\b/i,
  /\bplot\b/i,
  /\bqualitative\b.*\b(aggregation|labels?|themes?|outcomes?|counts?|trend|breakdown)\b/i,
  /\bratio\b/i,
  /\bsessions?\b.*\b(with|where|that|mention|mentioned|mentions)\b/i,
  /\bstructured\b.*\b(qualitative|themes?|outcomes?)\b/i,
  /\bsum\b/i,
  /\btheme(s)?\b.*\b(count|counts|frequency|trend|breakdown|by)\b/i,
  /\btotal(s|ed)?\b/i,
  /\btall(y|ies|ied)\b/i,
  /\btrend\b.*\b(day|week|month|over time)\b/i,
];

const RECORD_PRESENCE_PATTERNS = [
  /\b(?:records?|sessions?|entries?)\s+(?:with|where|that|mention|mentioned|mentions|including|include|includes|containing|contain|contains)\b/i,
  /\b(?:count|counts|counting|how many|number of|total)\s+(?:records?|sessions?|entries?)\b.*\b(?:with|where|that|mention|mentioned|mentions|including|include|includes|containing|contain|contains)\b/i,
];

const EVENT_SEPARATOR_PATTERN =
  /\s*(?:,|;|\band\b|\bor\b|\/|\+|&|\n|-{2,})\s*/i;

const EVENT_PREFIX_PATTERN =
  /^(?:count|counts|counting|track|tracks|tracking|show|shows|showing|for|of|like|including|include|includes|around|about|with)\s+/i;

const EXACT_EVENT_STOP_PATTERN =
  /\b(?:by|over|per|from|for each|grouped|chart|metric|milestone|summary|trend|session|record|date|week|month)\b/i;

const normalizeText = (value: unknown, maxLength = Infinity) => {
  const text =
    typeof value === 'string' || typeof value === 'number'
      ? String(value).trim().replace(/\s+/g, ' ')
      : '';

  return text.length <= maxLength ? text : text.slice(0, maxLength).trim();
};

const normalizeToken = (value: unknown) =>
  normalizeText(value)
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[.!?;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normalizeId = (value: unknown, fallback: string) => {
  const token = normalizeToken(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

  return token || fallback;
};

const normalizeEventLabel = (value: string) =>
  normalizeToken(value).replace(EVENT_PREFIX_PATTERN, '').trim();

const promptEventTail = (prompt: string) => {
  const normalized = normalizeText(prompt);

  const marker = normalized.match(
    /\b(?:count(?:s|ed|ing)?|frequency|how many|number of|totals?|tally(?:ing|ies)?)\b/i
  );

  if (!marker?.index && marker?.index !== 0) return '';
  const afterMarker = normalized.slice(marker.index + marker[0].length);
  const stop = afterMarker.search(EXACT_EVENT_STOP_PATTERN);
  return stop === -1 ? afterMarker : afterMarker.slice(0, stop);
};

export const extractTargetEvents = (prompt: string) => {
  const candidates = promptEventTail(prompt)
    .split(EVENT_SEPARATOR_PATTERN)
    .map(normalizeEventLabel)
    .filter((label) => label.length >= 3 && label.length <= 40)
    .filter((label) => !/^(records?|sessions?|events?|mentions?)$/.test(label));

  return [...new Set(candidates)].slice(0, 12);
};

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)])
    );
  }

  return value;
};

export const stableStringify = (value: unknown) =>
  JSON.stringify(stableValue(value));

export const stableHash = (value: unknown) => {
  const text = stableStringify(value);
  let first = 0xdeadbeef ^ text.length;
  let second = 0x41c6ce57 ^ text.length;

  for (let index = 0; index < text.length; index += 1) {
    const character = text.charCodeAt(index);
    first = Math.imul(first ^ character, 2654435761);
    second = Math.imul(second ^ character, 1597334677);
  }

  first =
    Math.imul(first ^ (first >>> 16), 2246822507) ^
    Math.imul(second ^ (second >>> 13), 3266489909);

  second =
    Math.imul(second ^ (second >>> 16), 2246822507) ^
    Math.imul(first ^ (first >>> 13), 3266489909);

  return `${(second >>> 0).toString(16).padStart(8, '0')}${(first >>> 0)
    .toString(16)
    .padStart(8, '0')}`;
};

const uniqueLabels = (values?: string[]) => [
  ...new Set(
    (values ?? []).map((value) => normalizeText(value, 60)).filter(Boolean)
  ),
];

const normalizeEventCountMode = (value: unknown): EventCountMode =>
  value === 'recordPresence' ? 'recordPresence' : 'explicitOccurrences';

const normalizeAggregationOperation = (
  aggregation: z.infer<typeof analysisAggregationSchema>
) =>
  aggregation.operation === 'currentStreak' &&
  /\bdays?\s+since\s+last\b/i.test(aggregation.label)
    ? 'daysSinceLast'
    : aggregation.operation;

const normalizeScoreScale = (
  value: unknown
):
  | { highLabel?: string; lowLabel?: string; max: number; min: number }
  | undefined => {
  const parsed = qualitativeScoreScaleSchema.safeParse(value);
  if (!parsed.success) return;
  const min = Math.min(parsed.data.min, parsed.data.max);
  const max = Math.max(parsed.data.min, parsed.data.max);
  if (min === max) return;

  return {
    ...(parsed.data.highLabel && {
      highLabel: normalizeText(parsed.data.highLabel, 40),
    }),
    ...(parsed.data.lowLabel && {
      lowLabel: normalizeText(parsed.data.lowLabel, 40),
    }),
    max,
    min,
  };
};

const withPromptDateFilters = (
  spec: CardAnalysisSpec | undefined,
  prompt: string,
  generationTime?: Date | number | string | null
) => {
  if (!spec) return;

  const filters = analysisDateFilters.parsePromptDateFilters({
    generationTime,
    prompt,
  });

  return filters.length ? { ...spec, filters } : spec;
};

const promptRequestsRecordPresence = (prompt: string) =>
  RECORD_PRESENCE_PATTERNS.some((pattern) => pattern.test(prompt));

const promptRequestsQualitativeDefault = (prompt: string) =>
  /\bqualitative\b.*\b(aggregation|labels?|themes?|outcomes?|counts?|trend|breakdown)\b/i.test(
    prompt
  ) ||
  /\bstructured\b.*\b(qualitative|themes?|outcomes?)\b/i.test(prompt) ||
  /\btheme(s)?\b.*\b(count|counts|frequency|trend|breakdown|by)\b/i.test(
    prompt
  );

const promptAllowsEventCountSpec = (prompt: string) =>
  extractTargetEvents(prompt).length > 0 ||
  promptRequestsRecordPresence(prompt);

const METADATA_COUNT_DIMENSIONS = [
  {
    dimension: 'tag',
    label: 'Tag',
    nounPattern: /\btags?\b/i,
    title: 'Tag counts',
  },
  {
    dimension: 'author',
    label: 'Author',
    nounPattern: /\b(authors?|people|person|members?|users?)\b/i,
    title: 'Author counts',
  },
] as const satisfies {
  dimension: AnalysisGroupingSpec['dimension'];
  label: string;
  nounPattern: RegExp;
  title: string;
}[];

const promptRequestsMetadataCounts = (prompt: string) => {
  const requestsCount =
    /\b(count|counts|counting|frequency|distribution|breakdown)\b/i.test(
      prompt
    ) || /\b(chart|graph|plot)\b/i.test(prompt);

  if (!requestsCount) return;

  return METADATA_COUNT_DIMENSIONS.find((item) =>
    item.nounPattern.test(prompt)
  );
};

const uniqueId = (id: string, used: Set<string>) => {
  let candidate = id;
  let suffix = 2;

  while (used.has(candidate)) {
    candidate = `${id}_${suffix}`.slice(0, 48);
    suffix += 1;
  }

  used.add(candidate);
  return candidate;
};

function remapId(value: string, ids: Map<string, string>): string;

function remapId(
  value: string | undefined,
  ids: Map<string, string>
): string | undefined;

function remapId(value: string | undefined, ids: Map<string, string>) {
  if (!value) return undefined;
  const normalized = normalizeId(value, value);
  return ids.get(value) ?? ids.get(normalized) ?? normalized;
}

const normalizeGrouping = (
  grouping: z.infer<typeof analysisGroupingSchema>,
  fallbackId: string
): AnalysisGroupingSpec => ({
  ...grouping,
  id: normalizeId(grouping.id, fallbackId),
  ...(grouping.label && { label: normalizeText(grouping.label, 60) }),
  ...(grouping.ranges?.length && {
    ranges: grouping.ranges.map((range) => ({
      ...(range.end && { end: normalizeText(range.end, 80) }),
      label: normalizeText(range.label, 40),
      ...(range.start && { start: normalizeText(range.start, 80) }),
    })),
  }),
});

const streakPeriodUnit = (period: StreakPeriod) =>
  period === 'day' ? 'days' : period === 'week' ? 'weeks' : 'months';

export const normalizeAnalysisSpec = (
  value: unknown
): CardAnalysisSpec | undefined => {
  const parsed = cardAnalysisSpecSchema.safeParse(value);
  if (!parsed.success) return;
  const usedFieldIds = new Set<string>();
  const fieldIdByInputId = new Map<string, string>();

  const extractionFields = parsed.data.extractionFields.map((field, index) => {
    const scoreScale = normalizeScoreScale(field.scoreScale);

    const id = uniqueId(
      normalizeId(field.id, `field_${index + 1}`),
      usedFieldIds
    );

    fieldIdByInputId.set(field.id, id);
    fieldIdByInputId.set(id, id);

    return {
      ...(field.type === 'event' && {
        countMode: normalizeEventCountMode(field.countMode),
      }),
      id,
      label: normalizeText(field.label, 60),
      labels: uniqueLabels(field.labels),
      ...(scoreScale &&
        (field.type === 'qualitative' || field.type === 'outcome') && {
          scoreScale,
        }),
      type: field.type,
      ...(field.unit && { unit: normalizeText(field.unit, 16).toLowerCase() }),
    };
  });

  const fieldIds = new Set(extractionFields.map((field) => field.id));
  const usedAggregationIds = new Set<string>();
  const aggregationIdByInputId = new Map<string, string>();

  const aggregationIdsByIndex = parsed.data.aggregations.map(
    (aggregation, index) => {
      const id = uniqueId(
        normalizeId(aggregation.id, `aggregation_${index + 1}`),
        usedAggregationIds
      );

      aggregationIdByInputId.set(aggregation.id, id);
      aggregationIdByInputId.set(id, id);
      return id;
    }
  );

  const aggregations = parsed.data.aggregations.flatMap(
    (aggregation, index) => {
      const fieldId = remapId(aggregation.fieldId, fieldIdByInputId);

      if (
        fieldId &&
        !fieldIds.has(fieldId) &&
        aggregation.operation !== 'ratio'
      ) {
        return [];
      }

      const {
        denominatorId: _denominatorId,
        fieldId: _fieldId,
        groupBy: _groupBy,
        numeratorId: _numeratorId,
        operation: _operation,
        ...normalizedAggregation
      } = aggregation;

      const id = aggregationIdsByIndex[index];

      const numeratorId = remapId(
        aggregation.numeratorId,
        aggregationIdByInputId
      );

      const denominatorId = remapId(
        aggregation.denominatorId,
        aggregationIdByInputId
      );

      const groupBy = aggregation.groupBy
        ? normalizeGrouping(aggregation.groupBy, `${id}_group`)
        : undefined;

      return {
        ...normalizedAggregation,
        ...(denominatorId && { denominatorId }),
        ...(fieldId && { fieldId }),
        ...(groupBy && { groupBy }),
        id,
        label: normalizeText(aggregation.label, 60),
        ...(numeratorId && { numeratorId }),
        operation: normalizeAggregationOperation(aggregation),
        ...(aggregation.period && { period: aggregation.period }),
        ...(aggregation.unit && {
          unit: normalizeText(aggregation.unit, 16).toLowerCase(),
        }),
      };
    }
  );

  const aggregationIds = new Set(aggregations.map((item) => item.id));

  const groupings = parsed.data.groupings.map((grouping, index) =>
    normalizeGrouping(grouping, `grouping_${index + 1}`)
  );

  const charts = parsed.data.charts.flatMap((chart, index) => {
    const measures = chart.y
      .map((measure) => ({
        ...measure,
        aggregationId: remapId(measure.aggregationId, aggregationIdByInputId),
      }))
      .filter((measure) => aggregationIds.has(measure.aggregationId))
      .map((measure) => ({
        ...measure,
        ...(measure.label && { label: normalizeText(measure.label, 60) }),
        ...(measure.unit && {
          unit: normalizeText(measure.unit, 16).toLowerCase(),
        }),
      }));

    if (!measures.length) return [];

    return {
      ...chart,
      id: normalizeId(chart.id, `chart_${index + 1}`),
      ...(chart.title && { title: normalizeText(chart.title, 80) }),
      x: normalizeGrouping(chart.x, `${chart.id || `chart_${index + 1}`}_x`),
      y: measures,
    };
  });

  const filters = analysisDateFilters.normalizeDateFilters(parsed.data.filters);

  return {
    aggregations,
    charts,
    extractionFields,
    ...(filters.length && { filters }),
    groupings,
  };
};

const buildEventCountFallbackAnalysisSpec = (
  prompt: string
): CardAnalysisSpec | undefined => {
  const targetEvents = extractTargetEvents(prompt);
  if (!targetEvents.length) return;

  const countMode = promptRequestsRecordPresence(prompt)
    ? 'recordPresence'
    : 'explicitOccurrences';

  return {
    aggregations: targetEvents.map((event) => ({
      eventLabel: event,
      fieldId: 'events',
      id: normalizeId(`${event}_count`, 'event_count'),
      label: event,
      operation: 'count',
    })),
    charts: [
      {
        id: 'event_counts',
        title: 'Event counts',
        type: 'bar',
        x: { dimension: 'event', id: 'event' },
        y: [
          {
            aggregationId: normalizeId(
              `${targetEvents[0]}_count`,
              'event_count'
            ),
          },
        ],
      },
    ],
    extractionFields: [
      {
        countMode,
        id: 'events',
        label: 'Events',
        labels: targetEvents,
        type: 'event',
      },
    ],
    groupings: [{ dimension: 'event', id: 'event', label: 'Event' }],
  };
};

const buildQualitativeFallbackAnalysisSpec = (
  prompt: string
): CardAnalysisSpec | undefined =>
  promptRequestsQualitativeDefault(prompt)
    ? {
        aggregations: [],
        charts: [],
        extractionFields: [
          { id: 'themes', label: 'Themes', type: 'qualitative' },
          { id: 'outcomes', label: 'Outcomes', type: 'outcome' },
        ],
        groupings: [],
      }
    : undefined;

const buildMetadataCountFallbackAnalysisSpec = (
  prompt: string
): CardAnalysisSpec | undefined => {
  const metadata = promptRequestsMetadataCounts(prompt);
  if (!metadata) return;

  return {
    aggregations: [
      { id: 'record_count', label: 'Records', operation: 'count' },
    ],
    charts: [
      {
        id: `${metadata.dimension}_counts`,
        title: metadata.title,
        type: 'bar',
        x: {
          dimension: metadata.dimension,
          id: metadata.dimension,
          label: metadata.label,
        },
        y: [{ aggregationId: 'record_count', label: 'Records' }],
      },
    ],
    extractionFields: [],
    groupings: [
      {
        dimension: metadata.dimension,
        id: metadata.dimension,
        label: metadata.label,
      },
    ],
  };
};

const promptRequestsStreaks = (prompt: string) => /\bstreaks?\b/i.test(prompt);

const promptStreakPeriod = (prompt: string): StreakPeriod => {
  if (/\b(monthly|months?)\b/i.test(prompt)) return 'month';
  if (/\b(weekly|weeks?)\b/i.test(prompt)) return 'week';
  return 'day';
};

const promptStreakGroupBy = (
  prompt: string
): AnalysisGroupingSpec | undefined =>
  /\b(each|per|by)\s+(users?|authors?|people|persons?|members?|posters?)\b/i.test(
    prompt
  ) ||
  /\b(users?|authors?|people|persons?|members?|posters?)\s+that\s+posts?\b/i.test(
    prompt
  )
    ? { dimension: 'author', id: 'author', label: 'Author' }
    : undefined;

const periodLabel = (period: StreakPeriod) =>
  period === 'day' ? 'daily' : period === 'week' ? 'weekly' : 'monthly';

const streakIdSuffix = ({
  groupBy,
  period,
}: {
  groupBy?: AnalysisGroupingSpec;
  period: StreakPeriod;
}) => `${period}_${groupBy?.dimension ? `by_${groupBy.dimension}` : 'streak'}`;

const buildStreakFallbackAnalysisSpec = (
  prompt: string
): CardAnalysisSpec | undefined => {
  if (!promptRequestsStreaks(prompt)) return;
  const period = promptStreakPeriod(prompt);
  const groupBy = promptStreakGroupBy(prompt);
  const unit = streakPeriodUnit(period);
  const suffix = streakIdSuffix({ groupBy, period });

  return {
    aggregations: [
      {
        ...(groupBy && { groupBy }),
        id: normalizeId(`current_${suffix}`, 'current_streak'),
        label: `Current ${periodLabel(period)} streak`,
        operation: 'currentStreak',
        period,
        unit,
      },
      {
        ...(groupBy && { groupBy }),
        id: normalizeId(`longest_${suffix}`, 'longest_streak'),
        label: `Longest ${periodLabel(period)} streak`,
        operation: 'longestStreak',
        period,
        unit,
      },
    ],
    charts: [],
    extractionFields: [],
    groupings: groupBy ? [groupBy] : [],
  };
};

const aggregationStreakPeriod = (
  aggregation: AnalysisAggregationSpec
): StreakPeriod => {
  if (aggregation.period) return aggregation.period;
  const dimension = aggregation.groupBy?.dimension;
  return dimension === 'week' || dimension === 'month' ? dimension : 'day';
};

const hasEquivalentStreakAggregation = (
  spec: CardAnalysisSpec | undefined,
  fallback: AnalysisAggregationSpec
) =>
  spec?.aggregations.some(
    (aggregation) =>
      aggregation.operation === fallback.operation &&
      (aggregation.operation === 'currentStreak' ||
        aggregation.operation === 'longestStreak') &&
      aggregationStreakPeriod(aggregation) ===
        aggregationStreakPeriod(fallback) &&
      (aggregation.groupBy?.dimension ?? '') ===
        (fallback.groupBy?.dimension ?? '')
  ) ?? false;

const pruneStreakFallbackSpec = (
  fallback: CardAnalysisSpec | undefined,
  baseSpec: CardAnalysisSpec | undefined
) => {
  if (!fallback || !baseSpec) return fallback;

  const aggregations = fallback.aggregations.filter(
    (aggregation) => !hasEquivalentStreakAggregation(baseSpec, aggregation)
  );

  if (!aggregations.length) return;

  return {
    ...fallback,
    aggregations,
    groupings: aggregations.some((aggregation) => aggregation.groupBy)
      ? fallback.groupings
      : [],
  };
};

const hasChartGrouping = (
  spec: CardAnalysisSpec | undefined,
  dimension: AnalysisGroupingSpec['dimension']
) => spec?.charts.some((chart) => chart.x.dimension === dimension) ?? false;

const pruneMetadataCountFallbackSpec = (
  fallback: CardAnalysisSpec | undefined,
  baseSpec: CardAnalysisSpec | undefined
) => {
  const dimension = fallback?.charts[0]?.x.dimension;

  if (!fallback || !dimension || !hasChartGrouping(baseSpec, dimension)) {
    return fallback;
  }
};

const mergeById = <T extends { id: string }>(items: T[]) => {
  const byId = new Map<string, T>();

  for (const item of items) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }

  return [...byId.values()];
};

const mergeAnalysisSpecs = (
  ...specs: (CardAnalysisSpec | undefined)[]
): CardAnalysisSpec | undefined => {
  const present = specs.filter((spec): spec is CardAnalysisSpec => !!spec);
  if (!present.length) return;
  const filters = present.flatMap((spec) => spec.filters ?? []);

  return {
    aggregations: mergeById(present.flatMap((spec) => spec.aggregations)),
    charts: mergeById(present.flatMap((spec) => spec.charts)),
    extractionFields: mergeById(
      present.flatMap((spec) => spec.extractionFields)
    ),
    ...(filters.length && { filters: mergeById(filters) }),
    groupings: mergeById(present.flatMap((spec) => spec.groupings)),
  };
};

const buildFallbackAnalysisSpec = (
  prompt: string,
  baseSpec?: CardAnalysisSpec
) =>
  mergeAnalysisSpecs(
    pruneStreakFallbackSpec(buildStreakFallbackAnalysisSpec(prompt), baseSpec),
    pruneMetadataCountFallbackSpec(
      buildMetadataCountFallbackAnalysisSpec(prompt),
      baseSpec
    ),
    buildEventCountFallbackAnalysisSpec(prompt),
    buildQualitativeFallbackAnalysisSpec(prompt)
  );

const isEventCountOnlySpec = (spec: CardAnalysisSpec) => {
  const eventFieldIds = new Set(
    spec.extractionFields
      .filter((field) => field.type === 'event')
      .map((field) => field.id)
  );

  return (
    eventFieldIds.size > 0 &&
    spec.extractionFields.every((field) => field.type === 'event') &&
    spec.aggregations.length > 0 &&
    spec.aggregations.every(
      (aggregation) =>
        aggregation.operation === 'count' &&
        !!aggregation.fieldId &&
        eventFieldIds.has(aggregation.fieldId)
    ) &&
    spec.charts.every((chart) => chart.x.dimension === 'event')
  );
};

export const analysisSpecHash = (spec: CardAnalysisSpec) =>
  stableHash({ analysisVersion: CARD_ANALYSIS_VERSION, spec });

export const promptRequestsExactAnalysis = (prompt: string) =>
  EXACT_PROMPT_PATTERNS.some((pattern) => pattern.test(prompt));

export const promptRequestsExactCandidate = promptRequestsExactAnalysis;

export const planCardAnalysis = ({
  analysisSpec,
  generationTime,
  mode,
  prompt,
}: {
  analysisSpec?: unknown;
  generationTime?: Date | number | string | null;
  mode?: CardAnalysisMode | null;
  prompt: string;
  totalMatchingRecords: number;
}): CardAnalysisPlan => {
  const normalizedSpec = withPromptDateFilters(
    normalizeAnalysisSpec(analysisSpec),
    prompt,
    generationTime
  );

  const safeNormalizedSpec =
    normalizedSpec &&
    (!isEventCountOnlySpec(normalizedSpec) ||
      promptAllowsEventCountSpec(prompt))
      ? normalizedSpec
      : undefined;

  const fallbackSpec = withPromptDateFilters(
    buildFallbackAnalysisSpec(prompt, safeNormalizedSpec),
    prompt,
    generationTime
  );

  if (mode === 'narrative' && !fallbackSpec) return { mode: 'narrative' };

  if (
    mode !== 'exact' &&
    !promptRequestsExactCandidate(prompt) &&
    !fallbackSpec
  ) {
    return { mode: 'narrative' };
  }

  const mergedSpec = mergeAnalysisSpecs(safeNormalizedSpec, fallbackSpec);

  const spec =
    mergedSpec &&
    (mergedSpec.extractionFields.length ||
      mergedSpec.aggregations.length ||
      mergedSpec.charts.length)
      ? mergedSpec
      : undefined;

  if (!spec) return { mode: 'narrative' };

  return {
    analysisSpec: spec,
    analysisSpecHash: analysisSpecHash(spec),
    mode: 'exact',
  };
};

export const recordFingerprint = ({
  record,
  selectedTagIds,
}: {
  record: CardSourceFactRecord;
  selectedTagIds: Iterable<string>;
}) => {
  const selected = new Set(
    cardSourceSelection.uniqueCardTagIds(selectedTagIds)
  );

  const matchingTags = (record.tags ?? [])
    .filter((tag) => selected.has(tag.id))
    .map((tag) => ({ id: tag.id, name: tag.name ?? null }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return stableHash({
    date: record.date ?? null,
    logId: record.logId ?? null,
    matchingTags,
    sourceAssemblyVersion:
      record.sourceAssemblyVersion ??
      cardSourceAssembly.CARD_SOURCE_ASSEMBLY_VERSION,
    status: record.status ?? null,
    text: record.text ?? '',
  });
};

export const factKey = ({
  analysisSpecHash,
  cardId,
  recordFingerprint,
  recordId,
}: {
  analysisSpecHash: string;
  cardId: string;
  recordFingerprint: string;
  recordId: string;
}) => stableHash({ analysisSpecHash, cardId, recordFingerprint, recordId });

export const selectExactRecords = <
  T extends cardSourceSelection.CardSourceRecord,
>(
  records: T[],
  options: {
    analysisSpec?: CardAnalysisSpec;
    generationTime?: Date | number | string | null;
  } = {}
) =>
  analysisDateFilters.filterRecordsByAnalysisDate({
    analysisSpec: options.analysisSpec,
    generationTime: options.generationTime,
    records,
  });

export const chunkRecordIds = ({
  chunkSize = CARD_EXACT_ANALYSIS_CHUNK_SIZE,
  recordIds,
}: {
  chunkSize?: number;
  recordIds: string[];
}) => {
  const chunks: string[][] = [];

  for (let index = 0; index < recordIds.length; index += chunkSize) {
    chunks.push(recordIds.slice(index, index + chunkSize));
  }

  return chunks;
};

export const countSelectedTags = ({
  records,
  tagIds,
}: {
  records: CardSourceFactRecord[];
  tagIds: string[];
}) => {
  const selected = new Set(cardSourceSelection.uniqueCardTagIds(tagIds));
  const counts = Object.fromEntries([...selected].map((tagId) => [tagId, 0]));

  for (const record of records) {
    for (const tag of record.tags ?? []) {
      if (selected.has(tag.id)) counts[tag.id] = (counts[tag.id] ?? 0) + 1;
    }
  }

  return counts;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const readNumber = (value: unknown) => {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(number) ? number : undefined;
};

const readEvidence = (value: unknown) => {
  const text = normalizeText(value, 180);
  return text || undefined;
};

const readFieldId = (value: unknown, fallback: string) =>
  normalizeId(value, fallback);

const readLabel = (value: unknown) => normalizeText(value, 60);
type ExtractionFieldById = Map<string, AnalysisExtractionField>;

const extractionFieldsById = (analysisSpec?: CardAnalysisSpec) =>
  analysisSpec
    ? new Map(analysisSpec.extractionFields.map((field) => [field.id, field]))
    : undefined;

const factField = ({
  fallback,
  fieldById,
  fieldId,
  types,
}: {
  fallback: string;
  fieldById?: ExtractionFieldById;
  fieldId: unknown;
  types: AnalysisExtractionField['type'][];
}) => {
  const id = readFieldId(fieldId, fallback);
  if (!fieldById) return { id };
  const field = fieldById.get(id);
  if (!field || !types.includes(field.type)) return;
  return { field, id: field.id };
};

const factLabelForField = ({
  field,
  value,
}: {
  field?: AnalysisExtractionField;
  value: string;
}) => {
  const label = normalizeToken(value);
  if (!label) return;
  if (!field?.labels?.length) return label;

  return field.labels
    .map((allowed) => normalizeToken(allowed))
    .find((allowed) => allowed === label);
};

const factScoreForField = ({
  field,
  score,
}: {
  field?: AnalysisExtractionField;
  score?: number;
}) => {
  if (score == null || !field?.scoreScale) return;

  return score >= field.scoreScale.min && score <= field.scoreScale.max
    ? score
    : undefined;
};

const readEventFacts = (
  facts: Record<string, unknown>,
  fieldById?: ExtractionFieldById
) => {
  const events: ExtractedEventFact[] = [];

  for (const item of asArray(facts.events)) {
    const event = asRecord(item);

    const field = factField({
      fallback: 'events',
      fieldById,
      fieldId: event.fieldId,
      types: ['event'],
    });

    if (!field) continue;

    const label = factLabelForField({
      field: field.field,
      value: normalizeEventLabel(readLabel(event.label)),
    });

    const count = readNumber(event.count);

    if (label && count != null && count > 0) {
      events.push({
        count:
          field.field?.countMode === 'recordPresence' ? 1 : Math.floor(count),
        ...(readEvidence(event.evidence) && {
          evidence: readEvidence(event.evidence),
        }),
        fieldId: field.id,
        label,
      });
    }
  }

  for (const [label, countValue] of Object.entries(
    asRecord(facts.eventCounts)
  )) {
    const normalized = normalizeEventLabel(label);
    const count = readNumber(countValue);

    const field = factField({
      fallback: 'events',
      fieldById,
      fieldId: 'events',
      types: ['event'],
    });

    if (!field) continue;

    const factLabel = factLabelForField({
      field: field.field,
      value: normalized,
    });

    if (factLabel && count != null && count > 0) {
      events.push({
        count:
          field.field?.countMode === 'recordPresence' ? 1 : Math.floor(count),
        fieldId: field.id,
        label: factLabel,
      });
    }
  }

  return events;
};

const readNumberFacts = (
  facts: Record<string, unknown>,
  fieldById?: ExtractionFieldById
) =>
  asArray(facts.numericValues)
    .map((item) => {
      const fact = asRecord(item);
      const value = readNumber(fact.value);
      if (value == null) return;

      const field = factField({
        fallback: 'number',
        fieldById,
        fieldId: fact.fieldId,
        types: ['number'],
      });

      if (!field) return;

      return {
        ...(readEvidence(fact.evidence) && {
          evidence: readEvidence(fact.evidence),
        }),
        fieldId: field.id,
        ...(readLabel(fact.label) && { label: readLabel(fact.label) }),
        ...((field.field?.unit ?? readLabel(fact.unit)) && {
          unit: (field.field?.unit ?? readLabel(fact.unit)).toLowerCase(),
        }),
        value,
      } satisfies ExtractedNumberFact;
    })
    .filter((fact): fact is ExtractedNumberFact => !!fact);

const readQualitativeFacts = (
  value: unknown,
  fallbackFieldId: string,
  fieldById?: ExtractionFieldById
): ExtractedQualitativeFact[] =>
  asArray(value)
    .map((item) => {
      const fact = asRecord(item);

      const field = factField({
        fallback: fallbackFieldId,
        fieldById,
        fieldId: fact.fieldId,
        types: ['qualitative', 'outcome'],
      });

      if (!field) return;

      const label = factLabelForField({
        field: field.field,
        value: readLabel(fact.label ?? fact.value),
      });

      if (!label) return;
      const score = readNumber(fact.score);
      const scaledScore = factScoreForField({ field: field.field, score });

      return {
        ...(readEvidence(fact.evidence) && {
          evidence: readEvidence(fact.evidence),
        }),
        fieldId: field.id,
        label,
        ...(scaledScore != null && { score: scaledScore }),
        ...(readLabel(fact.value) && { value: readLabel(fact.value) }),
      } satisfies ExtractedQualitativeFact;
    })
    .filter((fact): fact is ExtractedQualitativeFact => !!fact);

const readEvidenceFacts = (
  value: unknown,
  fieldById?: ExtractionFieldById
): ExtractedEvidenceFact[] =>
  asArray(value)
    .map((item) => {
      const fact = asRecord(item);
      const text = readEvidence(fact.text ?? item);
      if (!text) return;

      const fieldId =
        typeof fact.fieldId === 'string'
          ? readFieldId(fact.fieldId, 'evidence')
          : undefined;

      if (fieldId && fieldById && !fieldById.has(fieldId)) return;

      return {
        ...(fieldId && { fieldId }),
        text,
      } satisfies ExtractedEvidenceFact;
    })
    .filter((fact): fact is ExtractedEvidenceFact => !!fact);

export const readExtractedRecordFacts = (
  value: unknown,
  analysisSpec?: CardAnalysisSpec
): ExtractedRecordFacts | undefined => {
  const facts = asRecord(value);
  const recordId = typeof facts.recordId === 'string' ? facts.recordId : '';
  if (!recordId) return;
  const fieldById = extractionFieldsById(analysisSpec);

  return {
    events: readEventFacts(facts, fieldById),
    evidence: readEvidenceFacts(facts.evidence, fieldById),
    numericValues: readNumberFacts(facts, fieldById),
    outcomes: readQualitativeFacts(facts.outcomes, 'outcomes', fieldById),
    qualitativeLabels: [
      ...readQualitativeFacts(
        facts.qualitativeLabels,
        'qualitative',
        fieldById
      ),
      ...readQualitativeFacts(facts.themes, 'themes', fieldById),
    ],
    recordId,
  };
};

type FactEntry = { facts: ExtractedRecordFacts; record: CardSourceFactRecord };

const recordTime = (record: CardSourceFactRecord) => {
  const time = new Date(record.date ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

const entriesByRecordDate = (entries: FactEntry[]) =>
  [...entries].sort(
    (left, right) => recordTime(left.record) - recordTime(right.record)
  );

const formatChartValue = (value: number) => {
  if (Number.isInteger(value)) return value;
  return Number(value.toFixed(2));
};

const normalizeExactMetric = (result: DeterministicAggregateValue) => {
  if (result.groups?.length) return;

  const label = cardOutput.normalizeCardDisplayLabel({
    maxLength: cardOutput.MAX_CARD_METRIC_LABEL_LENGTH,
    maxWords: 5,
    value: result.label,
  });

  const value =
    typeof result.value === 'number'
      ? result.value
      : normalizeText(result.value, cardOutput.MAX_CARD_METRIC_VALUE_LENGTH);

  return label && value !== ''
    ? {
        label,
        ...(result.unit && {
          unit: normalizeText(result.unit, 16).toLowerCase(),
        }),
        value,
        ...(result.valueFormat && { valueFormat: result.valueFormat }),
      }
    : undefined;
};

const normalizeDate = (value?: Date | number | string | null) => {
  if (value == null) return;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? date : undefined;
};

const bucketDate = (
  record: CardSourceFactRecord,
  dimension: AnalysisGroupingSpec['dimension']
) => {
  const date = normalizeDate(record.date);
  if (!date) return { key: 'undated', label: 'Undated' };

  const period: StreakPeriod =
    dimension === 'month' || dimension === 'week' ? dimension : 'day';

  const key = dateBucketKey(date, period) ?? 'undated';
  return { key, label: period === 'day' ? date.toISOString() : key };
};

const dateBucketKey = (value: Date | number | string, period: StreakPeriod) => {
  const date = normalizeDate(value);
  if (!date) return;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  if (period === 'month') {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }

  if (period === 'week') {
    const weekDate = new Date(Date.UTC(year, month, day));
    const weekday = weekDate.getUTCDay() || 7;
    weekDate.setUTCDate(weekDate.getUTCDate() - weekday + 1);
    return weekDate.toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

const shiftBucketKey = (key: string, period: StreakPeriod, amount: number) => {
  if (period === 'month') {
    const [year, month] = key.split('-').map((part) => Number(part));
    if (!Number.isFinite(year) || !Number.isFinite(month)) return '';
    const date = new Date(Date.UTC(year, month - 1 + amount, 1));

    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
      2,
      '0'
    )}`;
  }

  const date = new Date(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + amount * (period === 'week' ? 7 : 1));
  return date.toISOString().slice(0, 10);
};

const previousBucketKey = (key: string, period: StreakPeriod) =>
  shiftBucketKey(key, period, -1);

const nextBucketKey = (key: string, period: StreakPeriod) =>
  shiftBucketKey(key, period, 1);

const matchesLabel = (value: string, target?: string) =>
  !target || normalizeToken(value) === normalizeToken(target);

const labelMatchTokens = (value: string) =>
  normalizeToken(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const matchesEventLabel = (value: string, target?: string) => {
  if (matchesLabel(value, target)) return true;
  if (!target) return true;
  const valueTokens = new Set(labelMatchTokens(value));
  const targetTokens = labelMatchTokens(target);

  return (
    targetTokens.length > 0 &&
    targetTokens.every((token) => valueTokens.has(token))
  );
};

const fieldMatches = (fieldId: string, targetFieldId?: string) =>
  !targetFieldId || fieldId === targetFieldId;

const eventCountForEntries = (
  entries: FactEntry[],
  aggregation: AnalysisAggregationSpec
) => {
  const recordIds = new Set<string>();
  let value = 0;

  for (const entry of entries) {
    for (const event of entry.facts.events) {
      if (
        fieldMatches(event.fieldId, aggregation.fieldId) &&
        matchesEventLabel(event.label, aggregation.eventLabel)
      ) {
        value += event.count;
        if (event.count > 0) recordIds.add(entry.record.id);
      }
    }
  }

  return { recordIds: [...recordIds], value };
};

const qualitativeFactsForAggregation = (
  entries: FactEntry[],
  aggregation: AnalysisAggregationSpec
) => {
  const target = aggregation.qualitativeLabel ?? aggregation.outcomeLabel;

  return entries.flatMap((entry) => {
    const facts = [
      ...entry.facts.qualitativeLabels,
      ...entry.facts.outcomes,
    ].filter(
      (fact) =>
        fieldMatches(fact.fieldId, aggregation.fieldId) &&
        matchesLabel(fact.label, target)
    );

    return facts.map((fact) => ({ fact, record: entry.record }));
  });
};

const numberFactsForAggregation = (
  entries: FactEntry[],
  aggregation: AnalysisAggregationSpec
) =>
  entries.flatMap((entry) =>
    entry.facts.numericValues
      .filter((fact) => fieldMatches(fact.fieldId, aggregation.fieldId))
      .map((fact) => ({ fact, record: entry.record }))
  );

const firstOrLatestValue = ({
  aggregation,
  entries,
}: {
  aggregation: AnalysisAggregationSpec;
  entries: FactEntry[];
}) => {
  const candidates = [
    ...numberFactsForAggregation(entries, aggregation).map((item) => ({
      record: item.record,
      value: item.fact.value,
    })),
    ...qualitativeFactsForAggregation(entries, aggregation).map((item) => ({
      record: item.record,
      value: item.fact.value ?? item.fact.label,
    })),
  ].sort((left, right) => recordTime(left.record) - recordTime(right.record));

  if (!candidates.length && !aggregation.fieldId) {
    const records = entries
      .map((entry) => entry.record)
      .sort((left, right) => recordTime(left) - recordTime(right));

    const record =
      aggregation.operation === 'first' ? records[0] : records.at(-1);

    const date = normalizeDate(record?.date);

    return record && date
      ? { recordIds: [record.id], value: date.toISOString() }
      : undefined;
  }

  const candidate =
    aggregation.operation === 'first' ? candidates[0] : candidates.at(-1);

  return candidate
    ? { recordIds: [candidate.record.id], value: candidate.value }
    : undefined;
};

const evaluateBaseAggregation = ({
  aggregation,
  entries,
}: {
  aggregation: AnalysisAggregationSpec;
  entries: FactEntry[];
}): Omit<DeterministicAggregateValue, 'id' | 'label'> | undefined => {
  if (aggregation.operation === 'ratio') return;

  if (aggregation.operation === 'first' || aggregation.operation === 'latest') {
    const result = firstOrLatestValue({ aggregation, entries });

    return result
      ? {
          operation: aggregation.operation,
          recordIds: result.recordIds,
          ...(aggregation.unit && { unit: aggregation.unit }),
          value: result.value,
        }
      : undefined;
  }

  const event = eventCountForEntries(entries, aggregation);
  const numberFacts = numberFactsForAggregation(entries, aggregation);
  const qualitativeFacts = qualitativeFactsForAggregation(entries, aggregation);
  const recordIds = new Set<string>();

  if (aggregation.fieldId) {
    for (const id of event.recordIds) recordIds.add(id);
    for (const item of numberFacts) recordIds.add(item.record.id);
    for (const item of qualitativeFacts) recordIds.add(item.record.id);
  } else {
    for (const entry of entries) recordIds.add(entry.record.id);
  }

  let value: number | undefined;
  const numericValues = numberFacts.map((item) => item.fact.value);

  const ordinalValues = qualitativeFacts
    .map((item) => item.fact.score)
    .filter((score): score is number => score != null);

  if (aggregation.operation === 'count') {
    value = aggregation.fieldId
      ? event.value || qualitativeFacts.length || numberFacts.length
      : entries.length;
  } else if (aggregation.operation === 'sum') {
    value = event.value || numericValues.reduce((sum, item) => sum + item, 0);
  } else if (aggregation.operation === 'average') {
    const values = numericValues.length ? numericValues : ordinalValues;

    value = values.length
      ? values.reduce((sum, item) => sum + item, 0) / values.length
      : undefined;
  } else if (aggregation.operation === 'min') {
    const values = numericValues.length ? numericValues : ordinalValues;
    value = values.length ? Math.min(...values) : undefined;
  } else if (aggregation.operation === 'max') {
    const values = numericValues.length ? numericValues : ordinalValues;
    value = values.length ? Math.max(...values) : undefined;
  }

  return value == null
    ? undefined
    : {
        operation: aggregation.operation,
        recordIds: [...recordIds],
        ...(aggregation.unit && { unit: aggregation.unit }),
        value: formatChartValue(value),
      };
};

const evaluateAggregation = ({
  aggregation,
  entries,
  generationTime,
  resultsById,
  selectedTagIds,
}: {
  aggregation: AnalysisAggregationSpec;
  entries: FactEntry[];
  generationTime?: Date | number | string | null;
  resultsById: Map<string, DeterministicAggregateValue>;
  selectedTagIds: string[];
}) => {
  if (
    aggregation.operation === 'currentStreak' ||
    aggregation.operation === 'longestStreak'
  ) {
    return evaluateStreakAggregation({
      aggregation,
      entries,
      generationTime,
      selectedTagIds,
    });
  }

  if (aggregation.operation === 'daysSinceLast') {
    return evaluateDaysSinceLastAggregation({ aggregation, entries });
  }

  if (aggregation.operation === 'ratio') {
    const numerator = aggregation.numeratorId
      ? resultsById.get(aggregation.numeratorId)
      : undefined;

    const denominator = aggregation.denominatorId
      ? resultsById.get(aggregation.denominatorId)
      : undefined;

    const numeratorValue =
      typeof numerator?.value === 'number' ? numerator.value : undefined;

    const denominatorValue =
      typeof denominator?.value === 'number' ? denominator.value : undefined;

    if (
      numeratorValue == null ||
      denominatorValue == null ||
      denominatorValue === 0
    ) {
      return;
    }

    return {
      id: aggregation.id,
      label: aggregation.label,
      operation: aggregation.operation,
      recordIds: [
        ...new Set([
          ...(numerator?.recordIds ?? []),
          ...(denominator?.recordIds ?? []),
        ]),
      ],
      ...(aggregation.unit && { unit: aggregation.unit }),
      value: formatChartValue(numeratorValue / denominatorValue),
    } satisfies DeterministicAggregateValue;
  }

  const result = evaluateBaseAggregation({ aggregation, entries });

  return result
    ? { ...result, id: aggregation.id, label: aggregation.label }
    : undefined;
};

const groupEntries = ({
  entries,
  grouping,
  selectedTagIds,
}: {
  entries: FactEntry[];
  grouping: AnalysisGroupingSpec;
  selectedTagIds: string[];
}) => {
  const groups = new Map<string, { entries: FactEntry[]; label: string }>();

  const add = (key: string, label: string, entry: FactEntry) => {
    const group = groups.get(key) ?? { entries: [], label };
    group.entries.push(entry);
    groups.set(key, group);
  };

  if (grouping.dimension === 'tag') {
    const selected = new Set(selectedTagIds);

    for (const entry of entries) {
      for (const tag of entry.record.tags ?? []) {
        if (selected.has(tag.id)) add(tag.id, tag.name ?? tag.id, entry);
      }
    }
  } else if (grouping.dimension === 'author') {
    for (const entry of entries) {
      const label = normalizeText(entry.record.author?.name, 60) || 'Unknown';
      add(entry.record.author?.id ?? label, label, entry);
    }
  } else if (
    grouping.dimension === 'day' ||
    grouping.dimension === 'week' ||
    grouping.dimension === 'month'
  ) {
    for (const entry of entries) {
      const bucket = bucketDate(entry.record, grouping.dimension);
      add(bucket.key, bucket.label, entry);
    }
  } else if (grouping.dimension === 'range') {
    for (const range of grouping.ranges ?? []) {
      const start = range.start ? new Date(range.start).getTime() : -Infinity;
      const end = range.end ? new Date(range.end).getTime() : Infinity;

      const matching = entries.filter((entry) => {
        const time = recordTime(entry.record);
        return time >= start && time <= end;
      });

      if (matching.length) {
        groups.set(range.label, { entries: matching, label: range.label });
      }
    }
  } else {
    for (const entry of entries) add(entry.record.id, entry.record.id, entry);
  }

  return [...groups.values()];
};

const dateGroupingDimensions = new Set<AnalysisGroupingSpec['dimension']>([
  'day',
  'week',
  'month',
]);

const streakPeriodForAggregation = (
  aggregation: AnalysisAggregationSpec
): StreakPeriod => {
  if (aggregation.period) return aggregation.period;
  const dimension = aggregation.groupBy?.dimension;

  return dimension && dateGroupingDimensions.has(dimension)
    ? (dimension as StreakPeriod)
    : 'day';
};

const entryMatchesAggregationField = (
  entry: FactEntry,
  aggregation: AnalysisAggregationSpec
) => {
  if (!aggregation.fieldId) return true;

  return (
    eventCountForEntries([entry], aggregation).value > 0 ||
    numberFactsForAggregation([entry], aggregation).length > 0 ||
    qualitativeFactsForAggregation([entry], aggregation).length > 0
  );
};

const recordIdsForBucketKeys = (
  buckets: Map<string, FactEntry[]>,
  keys: string[]
) => [
  ...new Set(
    keys.flatMap(
      (key) => buckets.get(key)?.map((entry) => entry.record.id) ?? []
    )
  ),
];

const streakForEntries = ({
  entries,
  generationTime,
  operation,
  period,
}: {
  entries: FactEntry[];
  generationTime?: Date | number | string | null;
  operation: 'currentStreak' | 'longestStreak';
  period: StreakPeriod;
}) => {
  const buckets = new Map<string, FactEntry[]>();

  for (const entry of entries) {
    if (!entry.record.date) continue;
    const key = dateBucketKey(entry.record.date, period);
    if (!key) continue;
    const bucket = buckets.get(key) ?? [];
    bucket.push(entry);
    buckets.set(key, bucket);
  }

  const keys = [...buckets.keys()].sort((left, right) =>
    left.localeCompare(right)
  );

  if (!keys.length) return;

  if (operation === 'currentStreak') {
    const anchor =
      (generationTime && dateBucketKey(generationTime, period)) ?? keys.at(-1);

    if (!anchor || !buckets.has(anchor)) return { recordIds: [], value: 0 };
    const streakKeys: string[] = [];
    let key = anchor;

    while (buckets.has(key)) {
      streakKeys.unshift(key);
      key = previousBucketKey(key, period);
    }

    return {
      recordIds: recordIdsForBucketKeys(buckets, streakKeys),
      value: streakKeys.length,
    };
  }

  let bestKeys: string[] = [];
  let currentKeys: string[] = [];
  let previousKey: string | undefined;

  for (const key of keys) {
    currentKeys =
      previousKey && nextBucketKey(previousKey, period) === key
        ? [...currentKeys, key]
        : [key];

    if (currentKeys.length > bestKeys.length) bestKeys = currentKeys;
    previousKey = key;
  }

  return {
    recordIds: recordIdsForBucketKeys(buckets, bestKeys),
    value: bestKeys.length,
  };
};

const evaluateStreakAggregation = ({
  aggregation,
  entries,
  generationTime,
  selectedTagIds,
}: {
  aggregation: AnalysisAggregationSpec;
  entries: FactEntry[];
  generationTime?: Date | number | string | null;
  selectedTagIds: string[];
}): DeterministicAggregateValue | undefined => {
  if (
    aggregation.operation !== 'currentStreak' &&
    aggregation.operation !== 'longestStreak'
  ) {
    return;
  }

  const period = streakPeriodForAggregation(aggregation);
  const operation = aggregation.operation;

  const activeEntries = entries.filter((entry) =>
    entryMatchesAggregationField(entry, aggregation)
  );

  if (!activeEntries.length) return;
  const grouping = aggregation.groupBy;

  if (grouping) {
    const groups = groupEntries({
      entries: activeEntries,
      grouping,
      selectedTagIds,
    })
      .map((group) => {
        const result = streakForEntries({
          entries: group.entries,
          generationTime,
          operation,
          period,
        });

        return result
          ? {
              label: group.label,
              recordIds: result.recordIds,
              value: result.value,
            }
          : undefined;
      })
      .filter(
        (
          group
        ): group is { label: string; recordIds: string[]; value: number } =>
          !!group
      )
      .sort(
        (left, right) =>
          Number(right.value) - Number(left.value) ||
          left.label.localeCompare(right.label)
      );

    if (!groups.length) return;
    const topValue = groups[0].value;

    return {
      groups,
      id: aggregation.id,
      label: aggregation.label,
      operation: aggregation.operation,
      recordIds: [
        ...new Set(
          groups
            .filter((group) => group.value === topValue)
            .flatMap((group) => group.recordIds)
        ),
      ],
      unit: aggregation.unit ?? streakPeriodUnit(period),
      value: topValue,
    };
  }

  const result = streakForEntries({
    entries: activeEntries,
    generationTime,
    operation,
    period,
  });

  return result
    ? {
        id: aggregation.id,
        label: aggregation.label,
        operation: aggregation.operation,
        recordIds: result.recordIds,
        unit: aggregation.unit ?? streakPeriodUnit(period),
        value: result.value,
      }
    : undefined;
};

const evaluateDaysSinceLastAggregation = ({
  aggregation,
  entries,
}: {
  aggregation: AnalysisAggregationSpec;
  entries: FactEntry[];
}): DeterministicAggregateValue | undefined => {
  if (aggregation.operation !== 'daysSinceLast') return;
  const sortedEntries = entriesByRecordDate(entries);

  const activeEntries = sortedEntries.filter((entry) =>
    entryMatchesAggregationField(entry, aggregation)
  );

  const latestEntry = activeEntries.at(-1);
  const latestDate = normalizeDate(latestEntry?.record.date);
  if (!latestEntry || !latestDate) return;

  return {
    id: aggregation.id,
    label: aggregation.label,
    operation: aggregation.operation,
    recordIds: [latestEntry.record.id],
    unit: aggregation.unit ?? 'days',
    value: latestDate.toISOString(),
    valueFormat: 'durationSince',
  };
};

const eventChartData = ({
  aggregation,
  entries,
}: {
  aggregation: AnalysisAggregationSpec;
  entries: FactEntry[];
}) => {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    for (const event of entry.facts.events) {
      if (!fieldMatches(event.fieldId, aggregation.fieldId)) continue;
      counts.set(event.label, (counts.get(event.label) ?? 0) + event.count);
    }
  }

  return [...counts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )
    .slice(0, cardOutput.MAX_CARD_CHART_POINTS)
    .map(([label, value]) => ({ label: normalizeText(label, 32), value }));
};

const buildChart = ({
  chart,
  entries,
  selectedTagIds,
  spec,
}: {
  chart: AnalysisChartSpec;
  entries: FactEntry[];
  selectedTagIds: string[];
  spec: CardAnalysisSpec;
}): cardOutput.CardChart | undefined => {
  const measures = chart.y
    .map((measure) => ({
      measure,
      aggregation: spec.aggregations.find(
        (aggregation) => aggregation.id === measure.aggregationId
      ),
    }))
    .filter(
      (item): item is typeof item & { aggregation: AnalysisAggregationSpec } =>
        !!item.aggregation
    );

  if (!measures.length) return;

  if (chart.x.dimension === 'event') {
    const aggregation = measures[0].aggregation;
    const data = eventChartData({ aggregation, entries });
    if (!data.length) return;

    return {
      data,
      ...(chart.title && { title: chart.title }),
      type: 'bar',
      ...(measures[0].measure.unit && { unit: measures[0].measure.unit }),
    };
  }

  const groups = groupEntries({ entries, grouping: chart.x, selectedTagIds });
  if (!groups.length) return;

  const series = measures.map(({ aggregation, measure }) => {
    const data = groups
      .map((group) => {
        const value = evaluateBaseAggregation({
          aggregation,
          entries: group.entries,
        })?.value;

        return typeof value === 'number'
          ? { label: normalizeText(group.label, 32), value }
          : undefined;
      })
      .filter(
        (datum): datum is cardOutput.CardChartDatum =>
          !!datum && Number.isFinite(datum.value)
      )
      .slice(0, cardOutput.MAX_CARD_CHART_POINTS);

    return data.length
      ? {
          data,
          label: normalizeText(measure.label ?? aggregation.label, 40),
          ...((measure.unit ?? aggregation.unit)
            ? { unit: measure.unit ?? aggregation.unit }
            : {}),
        }
      : undefined;
  });

  const validSeries = series.filter(
    (item): item is cardOutput.CardChartSeries => !!item
  );

  if (!validSeries.length) return;

  if (validSeries.length === 1) {
    const shouldSortBar =
      chart.type === 'bar' &&
      (chart.x.dimension === 'tag' || chart.x.dimension === 'author');

    const data = shouldSortBar
      ? [...validSeries[0].data].sort(
          (left, right) =>
            right.value - left.value || left.label.localeCompare(right.label)
        )
      : validSeries[0].data;

    return {
      data,
      ...(chart.title && { title: chart.title }),
      type: chart.type,
      ...(validSeries[0].unit && { unit: validSeries[0].unit }),
    };
  }

  return {
    ...(chart.title && { title: chart.title }),
    series: validSeries.slice(0, cardOutput.MAX_CARD_CHART_SERIES),
    type: 'line',
  };
};

const buildQualitativeAggregates = (entries: FactEntry[]) => {
  const themeCounts: Record<string, number> = {};
  const outcomeCounts: Record<string, number> = {};

  const evidenceByTheme = new Map<
    string,
    { evidence?: string; recordId: string }
  >();

  const scoreByLabel = new Map<string, { count: number; total: number }>();

  const coOccurrences = new Map<
    string,
    { count: number; labels: [string, string] }
  >();

  for (const entry of entries) {
    const labels = [
      ...new Set(entry.facts.qualitativeLabels.map((fact) => fact.label)),
    ].sort();

    for (const fact of entry.facts.qualitativeLabels) {
      themeCounts[fact.label] = (themeCounts[fact.label] ?? 0) + 1;

      if (!evidenceByTheme.has(fact.label)) {
        evidenceByTheme.set(fact.label, {
          ...(fact.evidence && { evidence: fact.evidence }),
          recordId: entry.record.id,
        });
      }

      if (fact.score != null) {
        const score = scoreByLabel.get(fact.label) ?? { count: 0, total: 0 };
        score.count += 1;
        score.total += fact.score;
        scoreByLabel.set(fact.label, score);
      }
    }

    for (const fact of entry.facts.outcomes) {
      outcomeCounts[fact.label] = (outcomeCounts[fact.label] ?? 0) + 1;
    }

    for (let left = 0; left < labels.length; left += 1) {
      for (let right = left + 1; right < labels.length; right += 1) {
        const pair: [string, string] = [labels[left], labels[right]];
        const key = pair.join('\0');
        const existing = coOccurrences.get(key) ?? { count: 0, labels: pair };
        existing.count += 1;
        coOccurrences.set(key, existing);
      }
    }
  }

  const representativeRecords = [...evidenceByTheme.entries()]
    .sort(
      ([left], [right]) =>
        (themeCounts[right] ?? 0) - (themeCounts[left] ?? 0) ||
        left.localeCompare(right)
    )
    .slice(0, 8)
    .map(([label, record]) => ({ label, ...record }));

  const ordinalScores = [...scoreByLabel.entries()]
    .map(([label, score]) => ({
      average: formatChartValue(score.total / score.count),
      count: score.count,
      label,
    }))
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label)
    );

  return {
    coOccurrences: [...coOccurrences.values()]
      .sort((left, right) => right.count - left.count)
      .slice(0, 12),
    ordinalScores,
    outcomeCounts,
    representativeRecords,
    themeCounts,
  } satisfies QualitativeAggregateFacts;
};

const buildEventCounts = (entries: FactEntry[]) => {
  const eventCounts: Record<string, number> = {};

  for (const entry of entries) {
    for (const event of entry.facts.events) {
      eventCounts[event.label] = (eventCounts[event.label] ?? 0) + event.count;
    }
  }

  return eventCounts;
};

export const aggregateExtractedFacts = ({
  analysisSpec,
  facts,
  generationTime,
  records,
  tagIds,
}: {
  analysisSpec: CardAnalysisSpec;
  facts: CardFactRecord[];
  generationTime?: Date | number | string | null;
  records: CardSourceFactRecord[];
  tagIds: string[];
}): ExactCardFacts => {
  const factsByRecordId = new Map<string, ExtractedRecordFacts>();

  for (const fact of facts) {
    const extracted = readExtractedRecordFacts(fact.facts, analysisSpec);
    if (extracted) factsByRecordId.set(extracted.recordId, extracted);
  }

  const filteredRecords = analysisDateFilters.filterRecordsByAnalysisDate({
    analysisSpec,
    generationTime,
    records,
  });

  const entries: FactEntry[] = filteredRecords.map((record) => ({
    facts: factsByRecordId.get(record.id) ?? {
      events: [],
      evidence: [],
      numericValues: [],
      outcomes: [],
      qualitativeLabels: [],
      recordId: record.id,
    },
    record,
  }));

  const resultsById = new Map<string, DeterministicAggregateValue>();

  for (const aggregation of analysisSpec.aggregations) {
    if (aggregation.operation === 'ratio') continue;

    const result = evaluateAggregation({
      aggregation,
      entries,
      generationTime,
      resultsById,
      selectedTagIds: tagIds,
    });

    if (result) resultsById.set(result.id, result);
  }

  for (const aggregation of analysisSpec.aggregations) {
    if (aggregation.operation !== 'ratio') continue;

    const result = evaluateAggregation({
      aggregation,
      entries,
      generationTime,
      resultsById,
      selectedTagIds: tagIds,
    });

    if (result) resultsById.set(result.id, result);
  }

  const qualitative = buildQualitativeAggregates(entries);
  const aggregateValues = [...resultsById.values()];

  const metrics = aggregateValues
    .map(normalizeExactMetric)
    .filter((metric): metric is NonNullable<typeof metric> => !!metric)
    .slice(0, cardOutput.MAX_CARD_METRICS);

  const chart = analysisSpec.charts
    .map((item) =>
      buildChart({
        chart: item,
        entries,
        selectedTagIds: tagIds,
        spec: analysisSpec,
      })
    )
    .find((item): item is cardOutput.CardChart => !!item);

  return {
    aggregateValues: Object.fromEntries(
      aggregateValues.map((value) => [value.id, value])
    ),
    analysisSpec,
    ...(chart && { chart }),
    eventCounts: buildEventCounts(entries),
    metrics,
    qualitative,
    selectedTagCounts: countSelectedTags({ records: filteredRecords, tagIds }),
    totalMatchingRecordCount: filteredRecords.length,
  };
};
