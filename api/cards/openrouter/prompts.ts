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

const exactStreakRules =
  'For exact streaks, preserve current vs longest in labels and summary wording. Do not introduce a streak value in the summary unless that same current/longest streak value is present in the output metrics or chart.';

const chartSelectionRules =
  'Use charts only when clearer than metrics or prose: line for chronological or ordered numeric series, bar for category totals or direct comparisons.';

const chartAnnotationRules = `Add chart.annotations only to call out a few pivotal points on a line chart, at most ${cardOutput.MAX_CARD_CHART_ANNOTATIONS}. Set annotation.x to the exact matching data point label (source record.date ISO timestamp for time series) and keep annotation.label a 1-3 word note. Omit annotations for bar charts and when no point needs a callout.`;

const groundingRules =
  'Do not invent causes, advice, diagnoses, goals, records, missing values, or units. State sparse or mixed evidence plainly.';

const sectionSelectionRules =
  'Use only sections that help. Charts are allowed for comparisons, trends, distributions, and grouped counts; metrics for compact headline values; milestones for notable dated events; summary for useful context. Do not pad.';

const chartOutputRules =
  'Bar charts use data. Use series only for multi-measure line charts. For record-level time series, labels must be source record.date full ISO timestamps, not YYYY-MM-DD. Order chronological points oldest-first.';

const metricOutputRules =
  'Keep metric labels concise and values compact. Order metrics by importance. Date metric values must put the full source record.date ISO timestamp in value and set valueFormat to date or datetime. For elapsed time since an event, put the latest source record.date ISO timestamp in value, set valueFormat to durationSince, and set unit to days, weeks, months, or years.';

const milestoneOutputRules =
  'Use milestones only for prompt-relevant notable records or threshold crossings. Milestone dates must be source record.date full ISO timestamps. Order newest-first.';

const summaryOutputRules = `Prefer summary only when it adds context not clear from chart or metrics. Keep summary at most ${cardOutput.MAX_CARD_GENERATED_SUMMARY_LENGTH} characters; use null when there is nothing useful to add.`;

const sectionDistinctnessRules =
  'Give each included section a distinct job. Avoid metrics that say the same thing in different words, and avoid repeating obvious chart values in metrics or summary unless card.prompt asks for them or they are the main takeaway.';

const labelSpecificityRules =
  'Keep metric and chart labels concise and complete. Preserve meaning-changing qualifiers: thresholds, score/scale names, units, groups, filters, and time windows. Avoid repeating equivalent threshold wording in one label; use either a named threshold or the numeric comparator when one implies the other. Labels must not end with connector words such as for, of, by, with, or to.';

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
      blueprintValue?: CardBlueprint;
      exact?: boolean;
      exactFacts?: cardAnalysis.ExactCardFacts;
      existingCards?: boolean;
      mode: 'generate';
      prompt: string;
    }
  | {
      exact?: boolean;
      exactFacts?: cardAnalysis.ExactCardFacts;
      mode: 'refresh';
      previousOutput: cardOutput.CardOutput;
      prompt: string;
    }
  | {
      exact?: boolean;
      exactFacts?: cardAnalysis.ExactCardFacts;
      mode: 'tweak';
      previousOutput: cardOutput.CardOutput;
      prompt: string;
      tweakPrompt: string;
    };

const CHART_PROMPT_PATTERNS = [
  /\b(?:chart|charts|charted|charting|graph|graphs|plot|plots|plotted|plotting)\b/i,
  /\b(?:compare|comparison|vs\.?|versus)\b/i,
  /\b(?:trend|trends|trending|over time)\b/i,
  /\b(?:distribution|breakdown|frequency)\b/i,
  /\b(?:daily|weekly|monthly|yearly)\b/i,
  /\b(?:by|per)\s+(?:day|week|month|year|tag|author|person|people|user|member|category|type|theme|outcome)\b/i,
  /\bacross\s+(?:days|weeks|months|years|tags|authors|people|users|categories|types|themes|outcomes)\b/i,
] as const;

const METRIC_PROMPT_PATTERNS = [
  /\b(?:metric|metrics|kpi|headline|stat|stats)\b/i,
  /\b(?:average|avg|sum|total|count|counts|counting|how many|number of|ratio|min|minimum|max|maximum|latest|first)\b/i,
  /\b(?:duration|score|rate|percent|percentage|threshold|streak)\b/i,
  /\b(?:days?|weeks?|months?|years?)\s+since\b/i,
] as const;

const MILESTONE_PROMPT_PATTERNS = [
  /\b(?:milestone|milestones|notable|highlight|highlights)\b/i,
  /\b(?:first|latest|last|record|best|worst|peak)\b/i,
  /\b(?:new high|new low|threshold crossing|crossed threshold)\b/i,
] as const;

const SUMMARY_PROMPT_PATTERNS = [
  /\b(?:summary|summarize|summarise|takeaway|takeaways|insight|insights|describe|explain|pattern|patterns)\b/i,
] as const;

const ARITHMETIC_PROMPT_PATTERNS = [
  /\b(?:average|avg|sum|total|count|counts|counting|how many|number of|ratio|min|minimum|max|maximum|latest|first|threshold|streak)\b/i,
  /\b(?:compare|comparison|vs\.?|versus)\b/i,
] as const;

const promptMatches = (prompt: string, patterns: readonly RegExp[]) =>
  patterns.some((pattern) => pattern.test(prompt));

const promptTextForRules = (options: OutputRulesOptions) =>
  options.mode === 'tweak'
    ? `${options.prompt} ${options.tweakPrompt}`
    : options.prompt;

const promptLooksSummaryOnly = (prompt: string) =>
  promptMatches(prompt, SUMMARY_PROMPT_PATTERNS) &&
  !promptMatches(prompt, [
    ...CHART_PROMPT_PATTERNS,
    ...METRIC_PROMPT_PATTERNS,
    ...MILESTONE_PROMPT_PATTERNS,
  ]);

const hasChartShape = (options: OutputRulesOptions) =>
  options.mode === 'generate'
    ? !!options.blueprintValue?.chart || !!options.exactFacts?.chart
    : !!options.previousOutput.chart || !!options.exactFacts?.chart;

const hasMetricShape = (options: OutputRulesOptions) =>
  options.mode === 'generate'
    ? !!options.blueprintValue?.metrics?.length ||
      !!options.exactFacts?.metrics.length
    : options.previousOutput.metrics.length > 0 ||
      !!options.exactFacts?.metrics.length;

const hasMilestoneShape = (options: OutputRulesOptions) =>
  options.mode === 'generate'
    ? options.blueprintValue?.milestones === true
    : options.previousOutput.milestones.length > 0;

const hasSummaryShape = (options: OutputRulesOptions) =>
  options.mode === 'generate'
    ? options.blueprintValue?.summary === true
    : !!options.previousOutput.summary?.trim();

const hasLockedOutputShape = (options: OutputRulesOptions) =>
  options.mode === 'generate' ? !!options.blueprint : true;

const outputRuleSections = (options: OutputRulesOptions) => {
  const promptText = promptTextForRules(options);
  const summaryOnly = promptLooksSummaryOnly(promptText);
  const lockedShape = hasLockedOutputShape(options);

  const chart =
    hasChartShape(options) || promptMatches(promptText, CHART_PROMPT_PATTERNS);

  const metrics =
    hasMetricShape(options) ||
    promptMatches(promptText, METRIC_PROMPT_PATTERNS) ||
    (!lockedShape && !summaryOnly);

  const milestones =
    hasMilestoneShape(options) ||
    promptMatches(promptText, MILESTONE_PROMPT_PATTERNS);

  const summary =
    hasSummaryShape(options) ||
    promptMatches(promptText, SUMMARY_PROMPT_PATTERNS) ||
    !lockedShape;

  const sectionCount = [chart, metrics, milestones, summary].filter(
    Boolean
  ).length;

  return {
    chart,
    metrics,
    milestones,
    multiSection: sectionCount > 1,
    quantitative:
      options.exact ||
      chart ||
      metrics ||
      promptMatches(promptText, ARITHMETIC_PROMPT_PATTERNS),
  };
};

const buildOutputRules = (options: OutputRulesOptions) => {
  const sections = outputRuleSections(options);

  const rules =
    options.mode === 'generate'
      ? options.blueprint
        ? 'Use card.blueprint as the requested output structure. Preserve defined sections, metric labels/order/value formatting, chart config, series labels, and milestone/summary presence. Do not add sections absent from blueprint.'
        : 'Include only useful sections; lead with the strongest section.'
      : options.mode === 'refresh'
        ? 'Preserve previousOutput shape and chart config. Do not add absent sections. Update only metric values/trends, chart data, summary text, and existing milestone content.'
        : 'Apply tweakPrompt to previousOutput. If it conflicts with prompt, tweakPrompt wins for this output. You may adjust format, labels, chart type, sections, or emphasis when asked.';

  const refreshMilestoneRules =
    options.mode === 'refresh' && options.previousOutput.milestones.length > 0
      ? 'When previousOutput has milestones, curate the current best milestone set: prefer recent/new milestones, keeping durable anchors only when high-signal. If an existing milestone remains relevant, keep its title and detail wording and date exactly unless source records show it is wrong.'
      : '';

  const existingCardRules =
    options.mode === 'generate' && options.existingCards
      ? 'existingCards are sibling progress cards with exactly the same source tags; use them only to avoid duplicate presentation, not as source evidence. Prefer a distinct angle from them when compatible with card.prompt and card.blueprint. Avoid repeating the same metric labels, chart focus, milestone titles, or summary prose unless the requested card explicitly needs that overlap.'
      : '';

  return [
    rules,
    refreshMilestoneRules,
    existingCardRules,
    sectionSelectionRules,
    sections.multiSection ? sectionDistinctnessRules : '',
    labelSpecificityRules,
    sections.metrics ? metricTrendRules : '',
    sections.chart ? chartOutputRules : '',
    sections.chart ? chartAnnotationRules : '',
    sections.metrics ? metricOutputRules : '',
    sections.milestones ? milestoneOutputRules : '',
    summaryOutputRules,
    sections.quantitative
      ? options.exact
        ? exactArithmeticRules
        : arithmeticRules
      : '',
    options.exact ? exactStreakRules : '',
    sections.chart ? chartSelectionRules : '',
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
  generationTime,
  repairMessage,
  prompt,
  records,
  totalRecordCount,
}: {
  analysisMode?: cardAnalysis.CardAnalysisMode;
  blueprint?: CardBlueprint;
  existingCards?: CardContextCard[];
  exactFacts?: cardAnalysis.ExactCardFacts;
  generationTime?: string;
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
        card: {
          generationTime: generationTime ?? null,
          ...(blueprint && { blueprint }),
          prompt,
        },
        ...(generationCardContext.length > 0 && {
          existingCards: generationCardContext,
        }),
        outputRules: buildOutputRules({
          exact,
          exactFacts: serializedExactFacts ? exactFacts : undefined,
          mode: 'generate',
          prompt,
          ...(blueprint && { blueprint: true, blueprintValue: blueprint }),
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
  generationTime,
  previousOutput,
  previousTitle,
  prompt,
  records,
  repairMessage,
  totalRecordCount,
}: {
  analysisMode?: cardAnalysis.CardAnalysisMode;
  exactFacts?: cardAnalysis.ExactCardFacts;
  generationTime?: string;
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  records: CardLlmRecord[];
  repairMessage?: string;
  totalRecordCount: number;
}): CardChatMessage[] => {
  const exact = analysisMode === 'exact' && !!exactFacts;

  const promptPreviousOutput =
    cardOutput.stripCardOutputMetadata(previousOutput);

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
        card: {
          generationTime: generationTime ?? null,
          previousOutput: promptPreviousOutput,
          previousTitle: previousTitle ?? null,
          prompt,
        },
        outputRules: buildOutputRules({
          exact,
          exactFacts: serializedExactFacts ? exactFacts : undefined,
          mode: 'refresh',
          previousOutput: promptPreviousOutput,
          prompt,
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

export const buildTweakMessages = ({
  analysisMode,
  exactFacts,
  generationTime,
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
  generationTime?: string;
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  records: CardLlmRecord[];
  repairMessage?: string;
  totalRecordCount: number;
  tweakPrompt: string;
}): CardChatMessage[] => {
  const exact = analysisMode === 'exact' && !!exactFacts;

  const promptPreviousOutput =
    cardOutput.stripCardOutputMetadata(previousOutput);

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
          generationTime: generationTime ?? null,
          previousOutput: promptPreviousOutput,
          previousTitle: previousTitle ?? null,
          prompt,
          tweakPrompt,
        },
        outputRules: buildOutputRules({
          exact,
          exactFacts: serializedExactFacts ? exactFacts : undefined,
          mode: 'tweak',
          previousOutput: promptPreviousOutput,
          prompt,
          tweakPrompt,
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
        'Use the minimal spec needed. Include prompt-requested sparse fields, but do not add fields unsupported by the prompt and examples. Choose narrative for broad interpretation, advice, or open-ended comparison unless structured qualitative labels/scores are requested. Set analysisSpec to null for narrative mode. Use stable short ids. Event fields must set countMode: explicitOccurrences for occurrence totals, or recordPresence for records/sessions with an event. Qualitative scoreScale is only for ordinal scores with explicit scale bounds; preserve the source or prompt scale. Use number fields for explicit numeric measurements, ratings, durations, counts, and numeric scales. Aggregations may use count, sum, average, min, max, latest, first, ratio, currentStreak, longestStreak, or daysSinceLast. For numeric threshold requests such as <=2, >=80, or below/above a score, extract the raw number field and put threshold: { operator, value } on the aggregation; do not model numeric thresholds as separate events when a numeric field is available. Ratio aggregations must reference numeratorId and denominatorId. Streak aggregations should set period to record for consecutive source records/sessions, or day/week/month only when a calendar cadence is requested; use groupBy for per-author or per-tag streaks. Calendar currentStreak is anchored to card.generationTime and counts consecutive active periods through that anchor. Record currentStreak counts consecutive matching records through the latest source record. Use daysSinceLast for elapsed time since the latest matching event/value, with unit days, weeks, months, or years as requested. Aggregation/chart labels should preserve thresholds, scale names, groups, and time windows compactly. Chart specs must reference aggregation ids and use chart.x for grouping by record, tag, author, event, day, week, month, or explicit range. Use record/day/week/month grouping for chronological charts. If the prompt asks for a date window, include filters on field record.date. Use startInclusive/endExclusive bounds. For relative rolling windows such as last/past N months, use type generationTime with an offset from card.generationTime for the start and generationTime for the end. Month/year offsets are rolling calendar offsets, not fixed day counts. For fixed date-only end bounds like through Apr 30, emit the requested date as endExclusive and the system will include that full UTC day. Records with missing or invalid dates are excluded by active filters. Qualitative specs request structured labels/scores/evidence, not freeform summaries.',
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
