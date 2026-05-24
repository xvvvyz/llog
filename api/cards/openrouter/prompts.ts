import type { CardBlueprint } from '@/domain/cards/blueprint';
import * as cardAnalysis from '@/domain/cards/analysis';
import * as cardOutput from '@/domain/cards/output';
import type { CardChatMessage, CardContextCard, CardLlmRecord } from './types';
import { compactText } from './utils';
import * as context from './context';

const metricTrendRules =
  'Set trend only for numeric point-in-time metrics with a prior comparable value or baseline. Leave trend null for cumulative/extreme/count/date/string metrics like longest, best, first, total, sessions, or ratios.';

const dateOutputRules =
  'Use full source record.date ISO timestamps for exact dates/times. Never use date-only YYYY-MM-DD, invented midnight values, or human-formatted dates like "May 20"; the UI formats ISO tokens.';

const supportedChartRules = `Supported charts are line charts and bar charts only. Line charts may use one data series or up to ${cardOutput.MAX_CARD_CHART_SERIES} named series. Bar charts use one data array, not stacked or grouped series. Charts can have at most ${cardOutput.MAX_CARD_CHART_POINTS} points per series. Do not ask for pie, donut, scatter, area, heatmap, calendar, histogram, gauge, stacked bar, grouped bar, or table charts.`;

const arithmeticRules =
  'Compute requested counts, ratios, thresholds, streaks, latest/firsts, and regressions mechanically against all provided matching records or returned chart points. For latest/first milestones, use chronological order. Count only affirmative event mentions; negated forms like "no [event]", "without [event]", "did not [event]", or "below [event] threshold" count as zero.';

const exactArithmeticRules =
  'When exactFacts are present, do not recalculate or adjust locked values from sampled records. Compare, summarize, or select among locked values only when exactFacts include the needed baseline, groups, or time series.';

const chartSelectionRules =
  'Use charts only when clearer than metrics or prose: line for chronological or ordered numeric series, bar for category totals or direct comparisons.';

const groundingRules =
  'Do not invent causes, advice, diagnoses, goals, records, missing values, or units. State sparse or mixed evidence plainly.';

const chartOutputRules =
  'Bar charts use data. Use series only for multi-measure line charts. For record-level time series, labels must be source record.date full ISO timestamps, not YYYY-MM-DD. Order chronological points oldest-first.';

const metricOutputRules =
  'Keep metric labels concise and values compact. Order metrics by importance. Date metric values must put the full source record.date ISO timestamp in value and set valueFormat to date or datetime.';

const milestoneOutputRules =
  'Use milestones only for prompt-relevant notable records or threshold crossings. Milestone dates must be source record.date full ISO timestamps. Order newest-first.';

const summaryOutputRules = `Prefer summary only when it adds context not clear from chart or metrics. Keep summary at most ${cardOutput.MAX_CARD_GENERATED_SUMMARY_LENGTH} characters; use null when there is nothing useful to add.`;

const sectionDistinctnessRules =
  'Give chart, metrics, and summary a distinct job. Avoid metrics or summary that only repeat an obvious chart value. Repeat values only when card.prompt asks for them or they are the main takeaway.';

const labelSpecificityRules =
  'Keep metric and chart labels concise, but preserve meaning-changing qualifiers: thresholds, score/scale names, units, groups, filters, and time windows.';

const labelStyle =
  'Use short sentence case labels, usually 1-4 words, with no ending or decorative punctuation.';

const recordContext =
  'Records are dated tagged user log entries. Cards summarize selected records and refresh as new matching records are added.';

const sourceRules =
  'Use timelineChunks for whole-history evidence and fullTextRecords for recent detail. Use numeric values only when records provide explicit numbers, dates, or countable events. totalMatchingRecordCount is exact. If selectedRecordCount equals totalMatchingRecordCount, every current matching record is provided. If selectedRecordCount is lower, selected records are a sample plus recent records: do not treat omitted records as inspected, and avoid exact aggregates or best/worst-ever claims that need omitted text.';

const exactSourceRules =
  'This is exact mode: exactFacts were computed deterministically from every current matching source record before this request. Treat exactFacts values as locked. Use only exactFacts for exact values, and sampled records only for wording, evidence, examples, and non-exact context.';

const buildSourceRules = ({
  analysisMode = 'narrative',
  exactFacts,
}: {
  analysisMode?: cardAnalysis.CardAnalysisMode;
  exactFacts?: cardAnalysis.ExactCardFacts;
}) => {
  const exact = analysisMode === 'exact' && !!exactFacts;
  const rules = exact ? exactSourceRules : sourceRules;

  return [
    rules,
    exact
      ? 'Never change locked exactFacts values. Locked exact facts may override previous output shape when needed to satisfy the card prompt.'
      : '',
  ]
    .filter(Boolean)
    .join(' ');
};

type OutputRulesOptions =
  | {
      blueprint?: boolean;
      exact?: boolean;
      existingCards?: boolean;
      mode: 'generate';
    }
  | { exact?: boolean; mode: 'refresh' }
  | { exact?: boolean; mode: 'tweak' };

const buildOutputRules = (options: OutputRulesOptions) => {
  const rules =
    options.mode === 'generate'
      ? options.blueprint
        ? 'Use card.blueprint as the requested output structure: preserve visible sections, metric labels/order/value formatting, chart config, and series labels. Include milestones when card.blueprint.milestones is true and summary only when card.blueprint.summary is true. Do not add sections absent from blueprint.'
        : 'Include only useful sections; do not pad. Put the most important preview metrics first.'
      : options.mode === 'refresh'
        ? 'Preserve previousOutput shape: metrics, chart config, and sections. Do not add absent sections. Prefer summary null when it would only repeat other sections. When previousOutput has milestones, curate the current best milestone set: prefer recent/new milestones, keeping durable anchors only when high-signal. If an existing milestone remains relevant, keep its title and detail wording and date exactly unless source records show it is wrong. Update only metric values/trends, chart data, and summary text for existing sections.'
        : 'Apply tweakPrompt to previousOutput. If it conflicts with prompt, tweakPrompt wins for this output. You may adjust format, labels, chart type, sections, or emphasis when asked.';

  const existingCardRules =
    options.mode === 'generate' && options.existingCards
      ? 'existingCards are sibling progress cards with exactly the same source tags; use them only to avoid duplicate presentation, not as source evidence. Prefer a distinct angle from them when compatible with card.prompt and card.blueprint. Avoid repeating the same metric labels, chart focus, milestone titles, or summary prose unless the requested card explicitly needs that overlap.'
      : '';

  return [
    rules,
    existingCardRules,
    sectionDistinctnessRules,
    labelSpecificityRules,
    metricTrendRules,
    chartOutputRules,
    metricOutputRules,
    milestoneOutputRules,
    summaryOutputRules,
    options.exact ? exactArithmeticRules : arithmeticRules,
    chartSelectionRules,
    dateOutputRules,
    groundingRules,
  ]
    .filter(Boolean)
    .join(' ');
};

export const buildMessages = ({
  analysisMode,
  blueprint,
  existingCards = [],
  exactFacts,
  repairMessage,
  prompt,
  records,
  totalRecordCount,
}: {
  analysisMode?: cardAnalysis.CardAnalysisMode;
  blueprint?: CardBlueprint;
  existingCards?: CardContextCard[];
  exactFacts?: cardAnalysis.ExactCardFacts;
  repairMessage?: string;
  prompt: string;
  records: CardLlmRecord[];
  totalRecordCount: number;
}): CardChatMessage[] => {
  const generationCardContext =
    context.buildGenerationCardContext(existingCards);

  const exact = analysisMode === 'exact' && !!exactFacts;

  const effectiveAnalysisMode: cardAnalysis.CardAnalysisMode = exact
    ? 'exact'
    : 'narrative';

  const serializedExactFacts = exact
    ? context.serializeExactFacts(exactFacts)
    : undefined;

  return [
    {
      content: `Extract progress from records. ${recordContext} Return JSON matching the response schema. ${exact ? 'Use only exactFacts for exact values and sampled records for wording/evidence.' : 'Use only the provided records.'} Keep language concise and specific. ${labelStyle}`,
      role: 'system',
    },
    {
      content: JSON.stringify({
        card: { ...(blueprint && { blueprint }), prompt },
        ...(generationCardContext.length > 0 && {
          existingCards: generationCardContext,
        }),
        outputRules: buildOutputRules({
          exact,
          mode: 'generate',
          ...(blueprint && { blueprint: true }),
          ...(generationCardContext.length > 0 && { existingCards: true }),
        }),
        sourceRules: buildSourceRules({
          analysisMode: effectiveAnalysisMode,
          exactFacts,
        }),
        ...(repairMessage && { repairMessage }),
        ...(serializedExactFacts && { exactFacts: serializedExactFacts }),
        records: context.buildRecordContext({
          analysisMode: effectiveAnalysisMode,
          records,
          totalRecordCount,
        }),
      }),
      role: 'user',
    },
  ];
};

export const buildRefreshMessages = ({
  analysisMode,
  exactFacts,
  previousOutput,
  previousTitle,
  prompt,
  records,
  repairMessage,
  totalRecordCount,
}: {
  analysisMode?: cardAnalysis.CardAnalysisMode;
  exactFacts?: cardAnalysis.ExactCardFacts;
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  records: CardLlmRecord[];
  repairMessage?: string;
  totalRecordCount: number;
}): CardChatMessage[] => {
  const exact = analysisMode === 'exact' && !!exactFacts;

  const effectiveAnalysisMode: cardAnalysis.CardAnalysisMode = exact
    ? 'exact'
    : 'narrative';

  const serializedExactFacts = exact
    ? context.serializeExactFacts(exactFacts)
    : undefined;

  return [
    {
      content: `Refresh an existing card from current source records. ${recordContext} Return JSON matching the response schema. ${exact ? 'Use only exactFacts for exact values and sampled records for wording/evidence.' : 'Use only the provided records.'} Preserve the existing format unless locked exact facts require an update. ${labelStyle}`,
      role: 'system',
    },
    {
      content: JSON.stringify({
        card: { previousOutput, previousTitle: previousTitle ?? null, prompt },
        outputRules: buildOutputRules({ exact, mode: 'refresh' }),
        sourceRules: buildSourceRules({
          analysisMode: effectiveAnalysisMode,
          exactFacts,
        }),
        ...(repairMessage && { repairMessage }),
        ...(serializedExactFacts && { exactFacts: serializedExactFacts }),
        records: context.buildRecordContext({
          analysisMode: effectiveAnalysisMode,
          records,
          totalRecordCount,
        }),
      }),
      role: 'user',
    },
  ];
};

export const buildTweakMessages = ({
  analysisMode,
  exactFacts,
  previousOutput,
  previousTitle,
  prompt,
  records,
  repairMessage,
  totalRecordCount,
  tweakPrompt,
}: {
  analysisMode?: cardAnalysis.CardAnalysisMode;
  exactFacts?: cardAnalysis.ExactCardFacts;
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  records: CardLlmRecord[];
  repairMessage?: string;
  totalRecordCount: number;
  tweakPrompt: string;
}): CardChatMessage[] => {
  const exact = analysisMode === 'exact' && !!exactFacts;

  const effectiveAnalysisMode: cardAnalysis.CardAnalysisMode = exact
    ? 'exact'
    : 'narrative';

  const serializedExactFacts = exact
    ? context.serializeExactFacts(exactFacts)
    : undefined;

  return [
    {
      content: `Tweak an existing card. ${recordContext} Return JSON matching the response schema. ${exact ? 'Use only exactFacts for exact values and sampled records for wording/evidence.' : 'Use only the provided records.'} Apply only the requested tweak. Keep unrelated facts and structure stable unless locked exact facts require an update. ${labelStyle}`,
      role: 'system',
    },
    {
      content: JSON.stringify({
        card: {
          previousOutput,
          previousTitle: previousTitle ?? null,
          prompt,
          tweakPrompt,
        },
        outputRules: buildOutputRules({ exact, mode: 'tweak' }),
        sourceRules: buildSourceRules({
          analysisMode: effectiveAnalysisMode,
          exactFacts,
        }),
        ...(repairMessage && { repairMessage }),
        ...(serializedExactFacts && { exactFacts: serializedExactFacts }),
        records: context.buildRecordContext({
          analysisMode: effectiveAnalysisMode,
          records,
          totalRecordCount,
        }),
      }),
      role: 'user',
    },
  ];
};

export const buildAnalysisPlanMessages = ({
  generationTime,
  prompt,
  records,
  totalRecordCount,
}: {
  generationTime?: string;
  prompt: string;
  records: CardLlmRecord[];
  totalRecordCount: number;
}): CardChatMessage[] => [
  {
    content:
      'Plan deterministic extraction and aggregation for a card over dated tagged records. Return JSON matching the response schema. Choose exact only for counts, charts, numeric aggregations, ratios, latest/first values, or consistently extractable structured qualitative aggregation.',
    role: 'system',
  },
  {
    content: JSON.stringify({
      card: { generationTime: generationTime ?? null, prompt },
      rules:
        'Use the minimal spec needed. Include prompt-requested sparse fields, but do not add fields unsupported by the prompt and examples. Choose narrative for broad interpretation, advice, or open-ended comparison unless structured qualitative labels/scores are requested. Set analysisSpec to null for narrative mode. Use stable short ids. Event fields must set countMode: explicitOccurrences for occurrence totals, or recordPresence for records/sessions with an event. Qualitative scoreScale is only for ordinal scores with explicit scale bounds; preserve the source or prompt scale. Aggregations may use count, sum, average, min, max, latest, first, ratio, currentStreak, or longestStreak. Ratio aggregations must reference numeratorId and denominatorId. Streak aggregations should set period to day, week, or month and use groupBy for per-author or per-tag streaks; currentStreak is anchored to card.generationTime. Aggregation/chart labels should preserve thresholds, scale names, groups, and time windows compactly. Chart specs must reference aggregation ids and use chart.x for grouping by record, tag, author, event, day, week, month, or explicit range. Use record/day/week/month grouping for chronological charts. If the prompt asks for a date window, include filters on field record.date. Use startInclusive/endExclusive bounds. For relative rolling windows such as last/past N months, use type generationTime with an offset from card.generationTime for the start and generationTime for the end. Month/year offsets are rolling calendar offsets, not fixed day counts. For fixed date-only end bounds like through Apr 30, emit the requested date as endExclusive and the system will include that full UTC day. Records with missing or invalid dates are excluded by active filters. Qualitative specs request structured labels/scores/evidence, not freeform summaries.',
      records: context.buildPlannerRecordContext({ records, totalRecordCount }),
    }),
    role: 'user',
  },
];

export const buildExtractionMessages = ({
  analysisSpec,
  repairMessage,
  records,
}: {
  analysisSpec: cardAnalysis.CardAnalysisSpec;
  repairMessage?: string;
  records: CardLlmRecord[];
}): CardChatMessage[] => [
  {
    content:
      'Extract deterministic structured facts from dated tagged records. Return JSON matching the response schema. Extract only analysisSpec fields. Use exact field ids and explicit record evidence; do not infer absent behavior.',
    role: 'system',
  },
  {
    content: JSON.stringify({
      analysisSpec,
      rules:
        'Use only analysisSpec field ids; do not include record ids. Return one item per input record using the provided 1-based recordIndex, with empty arrays when no facts apply. Include short evidence for every emitted numeric value, event, qualitative label, and outcome. recordPresence events use count 1 when present. explicitOccurrences counts separate supported mentions or reported occurrences; otherwise use 1 when present. Count only affirmative event mentions; negated forms like "no [event]", "without [event]", or "did not [event]" are not occurrences. For numbers, use values and units supported by record text and analysisSpec. For qualitative fields, emit structured labels/evidence, not subjective prose. Emit scores only with scoreScale; otherwise score null. Keep labels normalized to analysisSpec labels where possible.',
      ...(repairMessage && { repairMessage }),
      records: records.map(context.serializeIndexedFullRecord),
    }),
    role: 'user',
  },
];

export const buildPromptSuggestionMessages = ({
  existingCards,
  records,
}: {
  existingCards: CardContextCard[];
  records: CardLlmRecord[];
}): CardChatMessage[] => [
  {
    content: `Suggest concise reusable card prompts. ${recordContext} Return JSON matching the response schema. Use the provided records to infer what the card should track as new matching records arrive. Do not duplicate existing cards. Favor concrete charts, metrics, milestones, or focused summaries over vague analysis.`,
    role: 'system',
  },
  {
    content: JSON.stringify({
      existingCards: existingCards.map((card) => ({
        prompt: card.prompt ?? '',
        tags:
          card.tags
            ?.map((tag) => tag.name)
            .filter((name): name is string => !!name) ?? [],
        title: card.title ?? '',
      })),
      outputRules: `Return one editable prompt, 1-2 sentences and at most 500 characters, for a card that will refresh from future records. Focus on a durable progress signal, comparison, or milestone pattern. Name clear events, metrics, groupings, or timeframes. Keep it distinct from existing cards. Avoid one-off questions, advice, diagnosis, and unsupported data. If suggesting a chart, stay within supportedCharts.`,
      records: records.map((record) => ({
        author: context.recordAuthor(record),
        date: record.date ?? null,
        tags: context.recordTags(record),
        text: compactText(
          record.text,
          context.CARD_PROMPT_SUGGESTION_TEXT_MAX_LENGTH
        ),
      })),
      supportedCharts: supportedChartRules,
    }),
    role: 'user',
  },
];
