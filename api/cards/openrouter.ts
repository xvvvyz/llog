import { CARD_PROMPT_MAX_LENGTH } from '@/domain/cards/constants';
import * as cardOutput from '@/domain/cards/output';
import * as cardSourceSelection from '@/domain/cards/source-selection';
import type { ChatMessages, ChatResult } from '@openrouter/sdk/models';
import * as openrouter from '@/api/lib/openrouter';

const OPENROUTER_CARD_MODEL = 'openai/gpt-5.5';

export type CardLlmRecord = {
  date?: Date | number | string | null;
  id: string;
  tags?: { name?: string | null }[];
  text?: string | null;
};

export type CardPromptContextCard = {
  id: string;
  prompt?: string | null;
  tags?: { name?: string | null }[];
  title?: string | null;
};

const CARD_TIMELINE_TEXT_MAX_LENGTH = 280;
const CARD_FULL_TEXT_MAX_LENGTH = 2000;
const CARD_PROMPT_SUGGESTION_TEXT_MAX_LENGTH = 500;

const getString = (value: unknown) =>
  typeof value === 'string' ? value : undefined;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const cleanTitle = (value: unknown, defaultValue: string) =>
  cardOutput.normalizeCardDisplayLabel({
    defaultValue,
    maxLength: 36,
    maxWords: 5,
    value,
  }) ?? 'Progress card';

const defaultTitleFromPrompt = (prompt: string) => {
  const firstLine = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return cleanTitle(firstLine ?? prompt, 'Progress card');
};

const cleanPrompt = (value: unknown) => {
  const prompt = getString(value)?.replace(/\s+/g, ' ').trim();
  if (!prompt) return undefined;
  return prompt.slice(0, CARD_PROMPT_MAX_LENGTH);
};

const compactText = (value?: string | null, maxLength = Infinity) => {
  const text = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

const recordTags = (record: CardLlmRecord) =>
  record.tags?.map((tag) => tag.name).filter(Boolean) ?? [];

const serializeCompactRecord = (record: CardLlmRecord) => ({
  date: record.date ?? null,
  id: record.id,
  tags: recordTags(record),
  text: compactText(record.text, CARD_TIMELINE_TEXT_MAX_LENGTH),
});

const serializeFullRecord = (record: CardLlmRecord) => ({
  date: record.date ?? null,
  id: record.id,
  tags: recordTags(record),
  text: compactText(record.text, CARD_FULL_TEXT_MAX_LENGTH),
});

const chunkRecords = <T>(records: T[], chunkSize: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < records.length; index += chunkSize) {
    chunks.push(records.slice(index, index + chunkSize));
  }

  return chunks;
};

const buildRecordContext = ({
  records,
  totalRecordCount,
}: {
  records: CardLlmRecord[];
  totalRecordCount: number;
}) => {
  const fullTextRecords = records.slice(
    -cardSourceSelection.MAX_CARD_FULL_TEXT_RECORDS
  );

  return {
    fullTextRecords: fullTextRecords.map(serializeFullRecord),
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

const metricTrendRules =
  'Set trend to "up", "down", or "flat" only when that exact metric compares a current value against earlier records or an explicit historical baseline. Set trend to null for totals, counts, latest values, one-off facts, or any metric without ordered historical evidence.';

const outputSchemaDescription = {
  chart: `optional { type: "bar" | "line", title?: string, unit?: string, xAxis?: { labelMode?: "auto" | "all" | "sparse" }, yAxis?: { decimals?: 0 | 1 | 2, tickCount?: 3 | 4 | 5 | 6 }, data?: [{ label: string, value: number }], series?: [{ label: string, unit?: string, data: [{ label: string, value: number }] }] }. Limits: ${cardOutput.MAX_CARD_CHART_POINTS} points per series, ${cardOutput.MAX_CARD_CHART_SERIES} series. Bar charts use data. Use series only for multi-measure line charts; when using series, leave data empty. Keep natural record-level points needed by the prompt. Use concise labels and units. Date labels must be the source record.date full ISO timestamp, not YYYY-MM-DD; the UI formats them. Set xAxis/yAxis options only as needed for readability.`,
  metrics: `optional array of at most 6 { label, value, featured: boolean, unit?, trend: "up" | "down" | "flat" | null }. Mark 1-4 metrics as featured for the preview card. Prefer the highest-signal stats. ${metricTrendRules}`,
  milestones:
    'optional array of at most 8 { title, date?, detail?, recordIds? }. Dates must be source record.date full ISO timestamps, not YYYY-MM-DD or invented midnight values. Order newest-first.',
  sourceRecordIds: `optional evidence record ids, at most ${cardOutput.MAX_CARD_SOURCE_RECORD_IDS}. Include ids supporting chart points, metrics, milestones, or summary when practical.`,
  summary: 'optional plain text summary, at most 1200 characters',
};

const labelStyle =
  'Use short sentence case labels, usually 1-4 words, with no ending or decorative punctuation.';

const llogContext =
  'llog records are dated user log entries. Progress cards summarize selected tagged records and refresh as future matching records are added.';

const sourceRules =
  'Use timelineChunks for whole-history evidence: long-range stats, baselines, older milestones, firsts, and changes. Use fullTextRecords for recent detail. Do not base stats or milestones only on recent fullTextRecords when older timeline evidence matters. Use numeric values only when records provide explicit numbers, dates, or countable events. totalMatchingRecordCount is exact. If selectedRecordCount is lower, selected records are a sample plus recent records: do not treat omitted records as inspected, and avoid exact aggregates or best/worst-ever claims that need omitted text.';

type JsonSchema = Record<string, unknown>;
type CardChatMessage = Extract<ChatMessages, { role: 'system' | 'user' }>;
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
  required: ['labelMode'],
  type: 'object',
} satisfies JsonSchema;

const yAxisSchema = {
  additionalProperties: false,
  properties: {
    decimals: { enum: [0, 1, 2, null], type: ['integer', 'null'] },
    tickCount: { enum: [3, 4, 5, 6, null], type: ['integer', 'null'] },
  },
  required: ['decimals', 'tickCount'],
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
  required: ['label', 'unit', 'data'],
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
    xAxis: { anyOf: [xAxisSchema, { type: 'null' }] },
    yAxis: { anyOf: [yAxisSchema, { type: 'null' }] },
  },
  required: ['type', 'title', 'unit', 'xAxis', 'yAxis', 'data', 'series'],
  type: 'object',
} satisfies JsonSchema;

const metricSchema = {
  additionalProperties: false,
  properties: {
    featured: { type: 'boolean' },
    label: { type: 'string' },
    trend: { enum: ['up', 'down', 'flat', null], type: ['string', 'null'] },
    unit: nullableStringSchema,
    value: { anyOf: [{ type: 'number' }, { type: 'string' }] },
  },
  required: ['label', 'value', 'featured', 'unit', 'trend'],
  type: 'object',
} satisfies JsonSchema;

const milestoneSchema = {
  additionalProperties: false,
  properties: {
    date: nullableStringSchema,
    detail: nullableStringSchema,
    recordIds: { items: { type: 'string' }, maxItems: 20, type: 'array' },
    title: { type: 'string' },
  },
  required: ['title', 'date', 'detail', 'recordIds'],
  type: 'object',
} satisfies JsonSchema;

const cardOutputSchema = {
  additionalProperties: false,
  properties: {
    chart: { anyOf: [chartSchema, { type: 'null' }] },
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
    sourceRecordIds: {
      items: { type: 'string' },
      maxItems: cardOutput.MAX_CARD_SOURCE_RECORD_IDS,
      type: 'array',
    },
    summary: nullableStringSchema,
  },
  required: ['chart', 'metrics', 'milestones', 'sourceRecordIds', 'summary'],
  type: 'object',
} satisfies JsonSchema;

const jsonResponseSchema = ({
  description,
  name,
  properties,
}: {
  description: string;
  name: string;
  properties: Record<string, unknown>;
}) => ({
  description,
  name,
  schema: {
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
    type: 'object',
  },
  strict: true,
});

const generatedCardResponseSchema = jsonResponseSchema({
  description: 'Generated llog progress card output.',
  name: 'llog_card_generation',
  properties: { title: { type: 'string' }, output: cardOutputSchema },
});

const refreshedCardResponseSchema = jsonResponseSchema({
  description: 'Refreshed llog progress card output.',
  name: 'llog_card_refresh',
  properties: { output: cardOutputSchema },
});

const tweakedCardResponseSchema = jsonResponseSchema({
  description: 'Tweaked llog progress card output.',
  name: 'llog_card_tweak',
  properties: {
    title: nullableStringSchema,
    updatedPrompt: { type: 'string' },
    output: cardOutputSchema,
  },
});

const promptSuggestionResponseSchema = jsonResponseSchema({
  description: 'Suggested editable llog progress card prompt.',
  name: 'llog_card_prompt_suggestion',
  properties: { prompt: { type: 'string' } },
});

const buildMessages = ({
  repairMessage,
  prompt,
  records,
  totalRecordCount,
}: {
  repairMessage?: string;
  prompt: string;
  records: CardLlmRecord[];
  totalRecordCount: number;
}): CardChatMessage[] => [
  {
    content: `Extract progress from llog records. ${llogContext} Return only valid JSON. Use only the provided records. Keep language concise and specific. ${labelStyle}`,
    role: 'system',
  },
  {
    content: JSON.stringify({
      card: { prompt },
      outputSchema: {
        output: outputSchemaDescription,
        title:
          'short generated card title, at most 36 characters, specific to the requested progress view',
      },
      requiredJsonShape:
        'Return { "title": string, "output": object }. output must contain at least one useful section: chart, metrics, milestones, or summary.',
      outputRules: `Include only useful sections; do not pad. Use featured to choose preview metrics. ${metricTrendRules} Put milestones newest-first.`,
      sourceRules,
      ...(repairMessage && { repairMessage }),
      records: buildRecordContext({ records, totalRecordCount }),
    }),
    role: 'user',
  },
];

const buildRefreshMessages = ({
  previousOutput,
  previousTitle,
  prompt,
  records,
  repairMessage,
  totalRecordCount,
}: {
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  records: CardLlmRecord[];
  repairMessage?: string;
  totalRecordCount: number;
}): CardChatMessage[] => [
  {
    content: `Refresh an existing llog progress card from new source records. ${llogContext} Return only valid JSON. Use only the provided records. Preserve the existing format. ${labelStyle}`,
    role: 'system',
  },
  {
    content: JSON.stringify({
      card: { previousOutput, previousTitle: previousTitle ?? null, prompt },
      outputSchema: { output: outputSchemaDescription },
      requiredJsonShape:
        'Return { "output": object }. output must contain the same visible sections as previousOutput.',
      outputRules: `Preserve previousOutput shape: metrics, chart config, sections, and existing milestones. Add only genuinely new milestones when useful and there is room. Do not add absent sections. Update only metric values/trends, chart data, sourceRecordIds, and summary text for existing sections. ${metricTrendRules}`,
      sourceRules,
      ...(repairMessage && { repairMessage }),
      records: buildRecordContext({ records, totalRecordCount }),
    }),
    role: 'user',
  },
];

const buildTweakMessages = ({
  previousOutput,
  previousTitle,
  prompt,
  records,
  repairMessage,
  totalRecordCount,
  tweakPrompt,
}: {
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  records: CardLlmRecord[];
  repairMessage?: string;
  totalRecordCount: number;
  tweakPrompt: string;
}): CardChatMessage[] => [
  {
    content: `Tweak an existing llog progress card. ${llogContext} Return only valid JSON. Use only the provided records. Apply only the requested tweak. Keep unrelated facts and structure stable. ${labelStyle}`,
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
      outputSchema: {
        output: outputSchemaDescription,
        title:
          'short generated card title, at most 36 characters, or null to keep the current title',
        updatedPrompt: `required standalone editable card prompt, at most ${CARD_PROMPT_MAX_LENGTH} characters, for future refreshes`,
      },
      requiredJsonShape:
        'Return { "title": string | null, "updatedPrompt": string, "output": object }. output must contain at least one useful section: chart, metrics, milestones, or summary.',
      outputRules: `Apply tweakPrompt to previousOutput. If it conflicts with prompt, tweakPrompt wins. You may adjust the format, labels, chart type, sections, or emphasis when asked. Keep all output grounded in the provided records and previousOutput. ${metricTrendRules} Set updatedPrompt to the complete future prompt, with any conflicting original instruction removed.`,
      sourceRules,
      ...(repairMessage && { repairMessage }),
      records: buildRecordContext({ records, totalRecordCount }),
    }),
    role: 'user',
  },
];

const parseCardOutputResult = ({
  parsedJson,
  records,
}: {
  parsedJson: unknown;
  records: CardLlmRecord[];
}) => {
  const root = asRecord(parsedJson);
  const normalizedJson = cardOutput.normalizeRawCardOutput(root.output);
  const parsedOutput = cardOutput.validateCardOutput(normalizedJson);

  if (!parsedOutput.success) {
    const issues = parsedOutput.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.') || 'output'}: ${issue.message}`)
      .join('; ');

    return {
      errorMessage: `OpenRouter card generation returned invalid output${issues ? ` (${issues})` : ''}`,
      success: false as const,
    };
  }

  const output = cardOutput.normalizeCardOutputMilestoneDates(
    cardOutput.normalizeCardOutputSourceIds(
      parsedOutput.data,
      records.map((record) => record.id)
    ),
    records
  );

  return { output, root, success: true as const };
};

const parseGeneratedCardResult = ({
  defaultTitle,
  parsedJson,
  records,
}: {
  defaultTitle: string;
  parsedJson: unknown;
  records: CardLlmRecord[];
}) => {
  const parsedOutput = parseCardOutputResult({ parsedJson, records });
  if (!parsedOutput.success) return parsedOutput;

  return {
    output: parsedOutput.output,
    success: true as const,
    title: cleanTitle(parsedOutput.root.title, defaultTitle),
  };
};

const parseTweakedCardResult = ({
  defaultTitle,
  parsedJson,
  records,
}: {
  defaultTitle: string;
  parsedJson: unknown;
  records: CardLlmRecord[];
}) => {
  const parsedOutput = parseCardOutputResult({ parsedJson, records });
  if (!parsedOutput.success) return parsedOutput;
  const updatedPrompt = cleanPrompt(parsedOutput.root.updatedPrompt);

  if (!updatedPrompt) {
    return {
      errorMessage:
        'OpenRouter card tweak returned no updatedPrompt for future refreshes',
      success: false as const,
    };
  }

  return {
    output: parsedOutput.output,
    success: true as const,
    title: cleanTitle(parsedOutput.root.title, defaultTitle),
    updatedPrompt,
  };
};

const requestOpenRouterJson = async ({
  env,
  messages,
  responseSchema,
}: {
  env: CloudflareEnv;
  messages: CardChatMessage[];
  responseSchema: ReturnType<typeof jsonResponseSchema>;
}) => {
  const client = openrouter.createOpenRouter(env);
  let result: ChatResult;

  try {
    result = await client.chat.send({
      chatRequest: {
        messages,
        model: OPENROUTER_CARD_MODEL,
        responseFormat: { jsonSchema: responseSchema, type: 'json_schema' },
      },
    });
  } catch (error) {
    throw new Error(
      `OpenRouter card generation failed: ${openrouter.describeOpenRouterError(error)}`
    );
  }

  const message = result.choices[0]?.message;
  const refusal = getString(message?.refusal);

  if (refusal) {
    throw new Error(`OpenRouter card generation refused: ${refusal}`);
  }

  const content = getString(message?.content);

  if (!content) {
    throw new Error('OpenRouter card generation returned no content');
  }

  return JSON.parse(content) as unknown;
};

export const generateCardResult = async ({
  env,
  prompt,
  records,
  totalRecordCount = records.length,
}: {
  env: CloudflareEnv;
  prompt: string;
  records: CardLlmRecord[];
  totalRecordCount?: number;
}) => {
  if (!records.length) {
    throw new Error('Card generation requires source records');
  }

  const defaultTitle = defaultTitleFromPrompt(prompt);
  const messages = buildMessages({ prompt, records, totalRecordCount });

  const parsedJson = await requestOpenRouterJson({
    env,
    messages,
    responseSchema: generatedCardResponseSchema,
  });

  const parsedResult = parseGeneratedCardResult({
    defaultTitle,
    parsedJson,
    records,
  });

  if (parsedResult.success) return parsedResult;

  const repairedJson = await requestOpenRouterJson({
    env,
    messages: buildMessages({
      prompt,
      records,
      totalRecordCount,
      repairMessage: `${parsedResult.errorMessage}. Return { "title": string, "output": object } again. The output object must include at least one non-empty chart, metrics, milestones, or summary section based only on the provided records.`,
    }),
    responseSchema: generatedCardResponseSchema,
  });

  const repairedResult = parseGeneratedCardResult({
    defaultTitle,
    parsedJson: repairedJson,
    records,
  });

  if (!repairedResult.success) throw new Error(repairedResult.errorMessage);
  return repairedResult;
};

export const refreshCardResult = async ({
  env,
  previousOutput,
  previousTitle,
  prompt,
  records,
  totalRecordCount = records.length,
}: {
  env: CloudflareEnv;
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  records: CardLlmRecord[];
  totalRecordCount?: number;
}) => {
  if (!records.length) throw new Error('Card refresh requires source records');

  const messages = buildRefreshMessages({
    previousOutput,
    previousTitle,
    prompt,
    records,
    totalRecordCount,
  });

  const parsedJson = await requestOpenRouterJson({
    env,
    messages,
    responseSchema: refreshedCardResponseSchema,
  });

  const parsedResult = parseCardOutputResult({ parsedJson, records });

  if (parsedResult.success) {
    return {
      output: cardOutput.mergeCardOutputRefresh({
        next: parsedResult.output,
        previous: previousOutput,
      }),
    };
  }

  const repairedJson = await requestOpenRouterJson({
    env,
    messages: buildRefreshMessages({
      previousOutput,
      previousTitle,
      prompt,
      records,
      repairMessage: `${parsedResult.errorMessage}. Return { "output": object } again. Preserve the existing output shape and update only values/data based on the provided records.`,
      totalRecordCount,
    }),
    responseSchema: refreshedCardResponseSchema,
  });

  const repairedResult = parseCardOutputResult({
    parsedJson: repairedJson,
    records,
  });

  if (!repairedResult.success) throw new Error(repairedResult.errorMessage);

  return {
    output: cardOutput.mergeCardOutputRefresh({
      next: repairedResult.output,
      previous: previousOutput,
    }),
  };
};

export const tweakCardResult = async ({
  env,
  previousOutput,
  previousTitle,
  prompt,
  records,
  totalRecordCount = records.length,
  tweakPrompt,
}: {
  env: CloudflareEnv;
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  records: CardLlmRecord[];
  totalRecordCount?: number;
  tweakPrompt: string;
}) => {
  if (!records.length) throw new Error('Card tweak requires source records');
  const defaultTitle = previousTitle ?? defaultTitleFromPrompt(prompt);

  const messages = buildTweakMessages({
    previousOutput,
    previousTitle,
    prompt,
    records,
    totalRecordCount,
    tweakPrompt,
  });

  const parsedJson = await requestOpenRouterJson({
    env,
    messages,
    responseSchema: tweakedCardResponseSchema,
  });

  const parsedResult = parseTweakedCardResult({
    defaultTitle,
    parsedJson,
    records,
  });

  if (parsedResult.success) return parsedResult;

  const repairedJson = await requestOpenRouterJson({
    env,
    messages: buildTweakMessages({
      previousOutput,
      previousTitle,
      prompt,
      records,
      repairMessage: `${parsedResult.errorMessage}. Return { "title": string | null, "updatedPrompt": string, "output": object } again. Apply only the requested tweak, include a standalone updatedPrompt for future refreshes, and keep the result grounded in the provided records.`,
      totalRecordCount,
      tweakPrompt,
    }),
    responseSchema: tweakedCardResponseSchema,
  });

  const repairedResult = parseTweakedCardResult({
    defaultTitle,
    parsedJson: repairedJson,
    records,
  });

  if (!repairedResult.success) throw new Error(repairedResult.errorMessage);
  return repairedResult;
};

const buildPromptSuggestionMessages = ({
  existingCards,
  records,
}: {
  existingCards: CardPromptContextCard[];
  records: CardLlmRecord[];
}): CardChatMessage[] => [
  {
    content: `Suggest concise reusable llog progress card prompts. ${llogContext} Return only valid JSON. Use the provided records to infer what the card should track. Do not duplicate existing cards. Favor concrete charts, metrics, milestones, or focused summaries over vague analysis.`,
    role: 'system',
  },
  {
    content: JSON.stringify({
      existingCards: existingCards.map((card) => ({
        id: card.id,
        prompt: card.prompt ?? '',
        tags: card.tags?.map((tag) => tag.name).filter(Boolean) ?? [],
        title: card.title ?? '',
      })),
      outputSchema: {
        prompt:
          'concise editable prompt, 1-2 sentences, at most 500 characters, asking for a distinct progress view',
      },
      outputRules:
        'Return one editable prompt for a card that will refresh from future records. Focus on a durable progress signal, comparison, or milestone pattern. Keep it distinct from existing cards.',
      records: records.map((record) => ({
        date: record.date ?? null,
        id: record.id,
        text: compactText(record.text, CARD_PROMPT_SUGGESTION_TEXT_MAX_LENGTH),
      })),
    }),
    role: 'user',
  },
];

export const generateCardPromptSuggestion = async ({
  env,
  existingCards,
  records,
}: {
  env: CloudflareEnv;
  existingCards: CardPromptContextCard[];
  records: CardLlmRecord[];
}) => {
  const parsedJson = await requestOpenRouterJson({
    env,
    messages: buildPromptSuggestionMessages({ existingCards, records }),
    responseSchema: promptSuggestionResponseSchema,
  });

  const prompt = getString(asRecord(parsedJson).prompt)?.trim();

  if (!prompt) {
    throw new Error('OpenRouter card prompt suggestion returned no prompt');
  }

  return prompt.slice(0, 500);
};
