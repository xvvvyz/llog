import * as cardAnalysis from '@/domain/cards/analysis';
import * as cardOutput from '@/domain/cards/output';
import * as cardSourceSelection from '@/domain/cards/source-selection';
import type { CardContextCard, CardLlmRecord } from './types';
import { compactText } from './utils';

const CARD_TIMELINE_TEXT_MAX_LENGTH = 280;
const CARD_FULL_TEXT_MAX_LENGTH = 2000;
const CARD_PLANNER_TEXT_MAX_LENGTH = 900;
const CARD_EXISTING_CARD_CONTEXT_LIMIT = 8;
const CARD_EXISTING_CARD_MILESTONE_LIMIT = 5;
const CARD_EXISTING_CARD_PROMPT_MAX_LENGTH = 240;
const CARD_EXISTING_CARD_SUMMARY_MAX_LENGTH = 180;

export const CARD_PROMPT_SUGGESTION_TEXT_MAX_LENGTH = 500;

const PLANNER_FULL_RECORD_LIMIT = 60;
const PLANNER_FIRST_SAMPLE_LIMIT = 12;
const PLANNER_MIDDLE_SAMPLE_LIMIT = 12;
const PLANNER_RECENT_SAMPLE_LIMIT = 24;

const readCardOutput = (value: unknown) => {
  const parsed = cardOutput.validateCardOutput(value);
  return parsed.success ? parsed.data : undefined;
};

const serializeGenerationContextCard = (card: CardContextCard) => {
  const output = readCardOutput(card.output);

  const metrics =
    output?.metrics.map((metric) => ({
      label: metric.label,
      unit: metric.unit ?? null,
    })) ?? [];

  const milestoneTitles =
    output?.milestones
      .map((milestone) => milestone.title)
      .slice(0, CARD_EXISTING_CARD_MILESTONE_LIMIT) ?? [];

  const summary = compactText(
    output?.summary,
    CARD_EXISTING_CARD_SUMMARY_MAX_LENGTH
  );

  const chart = output?.chart
    ? {
        title: output.chart.title ?? null,
        type: output.chart.type,
        unit: output.chart.unit ?? null,
        seriesLabels: output.chart.series?.map((series) => series.label) ?? [],
      }
    : undefined;

  return {
    prompt: compactText(card.prompt, CARD_EXISTING_CARD_PROMPT_MAX_LENGTH),
    title: card.title ?? '',
    ...(output && {
      sections: {
        ...(chart && { chart }),
        ...(metrics.length && { metrics }),
        ...(milestoneTitles.length && { milestoneTitles }),
        ...(summary && { summary }),
      },
    }),
  };
};

export const buildGenerationCardContext = (cards: CardContextCard[] = []) =>
  cards
    .slice(0, CARD_EXISTING_CARD_CONTEXT_LIMIT)
    .map(serializeGenerationContextCard);

export const recordTags = (record: CardLlmRecord) =>
  record.tags
    ?.map((tag) => tag.name)
    .filter((name): name is string => !!name) ?? [];

export const recordAuthor = (record: CardLlmRecord) =>
  record.author?.name?.trim() || null;

const serializeCompactRecord = (record: CardLlmRecord) => ({
  author: recordAuthor(record),
  date: record.date ?? null,
  tags: recordTags(record),
  text: compactText(record.text, CARD_TIMELINE_TEXT_MAX_LENGTH),
});

export const serializeFullRecord = (record: CardLlmRecord) => ({
  author: recordAuthor(record),
  date: record.date ?? null,
  tags: recordTags(record),
  text: compactText(record.text, CARD_FULL_TEXT_MAX_LENGTH),
});

const serializePlannerRecord = (record: CardLlmRecord) => ({
  author: recordAuthor(record),
  date: record.date ?? null,
  tags: recordTags(record),
  text: compactText(record.text, CARD_PLANNER_TEXT_MAX_LENGTH),
});

export const serializeIndexedFullRecord = (
  record: CardLlmRecord,
  index: number
) => ({ ...serializeFullRecord(record), recordIndex: index + 1 });

const stripAggregateValueRecordIds = ({
  groups: _groups,
  recordIds: _recordIds,
  ...value
}: cardAnalysis.DeterministicAggregateValue) => ({
  ...value,
  ...(_groups?.length && {
    groups: _groups.map(({ recordIds: _recordIds, ...group }) => group),
  }),
});

export const serializeExactFacts = (facts?: cardAnalysis.ExactCardFacts) =>
  facts
    ? {
        aggregateValues: Object.fromEntries(
          Object.entries(facts.aggregateValues).map(([key, value]) => [
            key,
            stripAggregateValueRecordIds(value),
          ])
        ),
        ...(facts.chart && { chart: facts.chart }),
        eventCounts: facts.eventCounts ?? {},
        metrics: facts.metrics,
        ...(facts.qualitative && {
          qualitative: {
            ...facts.qualitative,
            representativeRecords: facts.qualitative.representativeRecords.map(
              ({ recordId: _recordId, ...record }) => record
            ),
          },
        }),
        selectedTagCounts: facts.selectedTagCounts,
        totalMatchingRecordCount: facts.totalMatchingRecordCount,
      }
    : undefined;

const chunkRecords = <T>(records: T[], chunkSize: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < records.length; index += chunkSize) {
    chunks.push(records.slice(index, index + chunkSize));
  }

  return chunks;
};

export const buildRecordContext = ({
  analysisMode = 'narrative',
  records,
  totalRecordCount,
}: {
  analysisMode?: cardAnalysis.CardAnalysisMode;
  records: CardLlmRecord[];
  totalRecordCount: number;
}) => {
  const fullTextRecords = records.slice(
    -cardSourceSelection.MAX_CARD_FULL_TEXT_RECORDS
  );

  return {
    fullTextRecords: fullTextRecords.map(serializeFullRecord),
    mode: analysisMode,
    selectedRecordCount: records.length,
    timelineChunks: chunkRecords(
      records,
      cardSourceSelection.CARD_ANALYSIS_CHUNK_SIZE
    ).map((chunk, index) => ({
      endDate: chunk.at(-1)?.date ?? null,
      index: index + 1,
      recordCount: chunk.length,
      records: chunk.map(serializeCompactRecord),
      startDate: chunk[0]?.date ?? null,
    })),
    totalMatchingRecordCount: totalRecordCount,
  };
};

const tagCountsForRecords = (records: CardLlmRecord[]) => {
  const counts: Record<string, number> = {};

  for (const record of records) {
    for (const tag of recordTags(record)) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }

  return counts;
};

export const buildPlannerRecordContext = ({
  records,
  totalRecordCount,
}: {
  records: CardLlmRecord[];
  totalRecordCount: number;
}) => {
  const summary = {
    firstDate: records[0]?.date ?? null,
    latestDate: records.at(-1)?.date ?? null,
    providedRecordCount: records.length,
    tagCounts: tagCountsForRecords(records),
    totalMatchingRecordCount: totalRecordCount,
  };

  if (records.length <= PLANNER_FULL_RECORD_LIMIT) {
    return { fullRecords: records.map(serializePlannerRecord), summary };
  }

  const seen = new Set<string>();

  const sample = (items: CardLlmRecord[]) =>
    items
      .filter((record) => {
        if (seen.has(record.id)) return false;
        seen.add(record.id);
        return true;
      })
      .map(serializePlannerRecord);

  const middleStart = Math.max(
    0,
    Math.floor(records.length / 2) - Math.floor(PLANNER_MIDDLE_SAMPLE_LIMIT / 2)
  );

  return {
    samples: {
      firstRecords: sample(records.slice(0, PLANNER_FIRST_SAMPLE_LIMIT)),
      middleRecords: sample(
        records.slice(middleStart, middleStart + PLANNER_MIDDLE_SAMPLE_LIMIT)
      ),
      recentRecords: sample(records.slice(-PLANNER_RECENT_SAMPLE_LIMIT)),
    },
    summary,
  };
};
