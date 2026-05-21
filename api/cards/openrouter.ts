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

const outputSchemaDescription = {
  chart: `optional { type: "bar" | "line", title?: string, unit?: string, xAxis?: { labelMode?: "auto" | "all" | "sparse" }, yAxis?: { decimals?: 0 | 1 | 2, tickCount?: 3 | 4 | 5 | 6 }, data?: [{ label: string, value: number }], series?: [{ label: string, unit?: string, data: [{ label: string, value: number }] }] } with at most ${cardOutput.MAX_CARD_CHART_POINTS} points per series and at most ${cardOutput.MAX_CARD_CHART_SERIES} series. Use series only for line charts when the card asks for multiple measures over the same records, for example alone time duration plus peak distress. When using series, leave data empty. Bar charts must use data, not series. Each line series renders as its own graph with a shared key. Use concise series labels and units. Keep every natural data point needed for the requested progress chart; do not drop intermediate record-level points just for compactness. Use the shortest useful data labels. For date data labels, use the full source record.date ISO timestamp, for example "2026-05-20T15:30:00.000Z"; do not output YYYY-MM-DD date-only labels. The UI will format ISO timestamps in the viewer's current timezone. Set xAxis.labelMode to "all" only for a few short labels, "sparse" for dense labels, and "auto" when unsure. Set yAxis.decimals to the smallest useful precision and yAxis.tickCount to the fewest ticks that still makes the scale readable.`,
  metrics:
    'optional array of at most 6 { label, value, featured: boolean, unit?, trend?: "up" | "down" | "flat" }. Set featured true only for stats that should appear on the preview card. If returning metrics, mark at least one and at most four as featured. Prefer the most high-signal, glanceable stats; usually feature 1-2 stats unless the card is metrics-only.',
  milestones:
    'optional array of at most 8 { title, date?, status: "complete" | "in_progress" | "blocked" | "upcoming", detail?, recordIds? }. When a milestone has a date, use the full source record.date ISO timestamp, for example "2026-05-20T15:30:00.000Z"; do not output YYYY-MM-DD date-only strings or invented midnight timestamps. The UI will format ISO timestamps in the viewer\'s current timezone. Order milestones newest-first by date so the latest milestone appears first.',
  sourceRecordIds: `optional array of record ids used as evidence, at most ${cardOutput.MAX_CARD_SOURCE_RECORD_IDS}. When practical, include ids that support returned chart points, metrics, milestones, or summary.`,
  summary: 'optional plain text summary, at most 1200 characters',
};

const labelStyle =
  'For card title, chart title, metric labels, series/key labels, milestone titles, and non-date chart labels: use the shortest useful sentence case labels, no ending punctuation, no decorative punctuation, normally 1-4 words.';

const sourceRules =
  'Use timelineChunks for long-range progress stats, baselines, older milestones, first occurrences, and changes across the whole selected history. Use fullTextRecords for richer recent details. Do not base stats or milestones only on the recent full-text window when older timeline evidence is relevant. Use numeric metrics and chart values only when the records provide explicit numbers, dates, or clearly countable events; do not estimate hidden quantities from vague language. totalMatchingRecordCount is the exact matching published record count. If selectedRecordCount is lower than totalMatchingRecordCount, selected records are a sample plus the most recent records: do not treat omitted records as inspected, and avoid exact aggregate counts, totals, averages, rates, or best/worst-ever claims that require omitted record text.';

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
    status: {
      enum: ['complete', 'in_progress', 'blocked', 'upcoming'],
      type: 'string',
    },
    title: { type: 'string' },
  },
  required: ['title', 'date', 'status', 'detail', 'recordIds'],
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
  previousTitle,
  prompt,
  records,
  totalRecordCount,
}: {
  repairMessage?: string;
  previousTitle?: string | null;
  prompt: string;
  records: CardLlmRecord[];
  totalRecordCount: number;
}): CardChatMessage[] => [
  {
    content: `You extract and aggregate progress from llog records. Return only valid JSON. Do not invent facts or use sources outside the provided records. Keep language concise and specific. ${labelStyle}`,
    role: 'system',
  },
  {
    content: JSON.stringify({
      card: { previousTitle: previousTitle ?? null, prompt },
      outputSchema: {
        output: outputSchemaDescription,
        title:
          'short generated card title, at most 36 characters, specific to the requested progress view',
      },
      requiredJsonShape:
        'Return a top-level JSON object with exactly this shape: { "title": string, "output": object }. The output object must contain at least one non-empty useful section: chart, metrics, milestones, or summary.',
      outputRules:
        'Return only the output sections that make the card useful. Do not pad the response with a summary, metrics, milestones, or chart if the prompt does not need them. At least one of chart, metrics, milestones, or summary must be present. When returning metrics, use featured to choose which stats appear on the compact preview card. When returning milestones, put the latest milestone first.',
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
    content: `You refresh an existing llog progress card from new source records. Return only valid JSON. Do not invent facts or use sources outside the provided records. Preserve the existing card format. ${labelStyle}`,
    role: 'system',
  },
  {
    content: JSON.stringify({
      card: { previousOutput, previousTitle: previousTitle ?? null, prompt },
      outputSchema: { output: outputSchemaDescription },
      requiredJsonShape:
        'Return a top-level JSON object with exactly this shape: { "output": object }. The output object must contain the same visible sections as previousOutput.',
      outputRules:
        'Preserve previousOutput shape. Keep metric count, order, labels, units, and featured flags. Keep chart type, title, unit, axes, series count, and series labels. Keep existing milestones unchanged; include them and add only genuinely new milestones if useful and there is room. Do not add a chart, metrics, milestones, or summary section that previousOutput did not have. Update only metric values/trends, chart data points, sourceRecordIds, and summary text when the previous card already has those sections.',
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
    content: `You tweak an existing llog progress card. Return only valid JSON. Do not invent facts or use sources outside the provided records. Start from the previous output and apply only the requested tweak. If prompt and tweakPrompt conflict, tweakPrompt overrides prompt. Do not keep an old prompt constraint that the tweak reverses. ${labelStyle}`,
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
          'optional short generated card title, at most 36 characters, only if the tweak asks for a title change',
        updatedPrompt: `required standalone editable card prompt, at most ${CARD_PROMPT_MAX_LENGTH} characters, combining the original prompt and requested tweak so future refreshes preserve the new intent. If the requested tweak contradicts the original prompt, remove or rewrite the conflicting original instruction so the tweak takes priority.`,
      },
      requiredJsonShape:
        'Return a top-level JSON object with exactly this shape: { "title"?: string, "updatedPrompt": string, "output": object }. The output object must include at least one non-empty useful section: chart, metrics, milestones, or summary.',
      outputRules:
        'Modify previousOutput only as requested by tweakPrompt. tweakPrompt overrides prompt when they conflict, including when prompt says not to do something and tweakPrompt asks to do it. You may adjust the output format, labels, chart type, sections, or emphasis if the tweak asks for it. Keep unrelated facts and structure stable. Keep all output grounded in the provided records and previousOutput. Set updatedPrompt to a complete replacement for prompt, not a note about the tweak. updatedPrompt must remove or rewrite any original prompt instruction that conflicts with tweakPrompt, and output must reflect the updatedPrompt.',
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
  previousTitle,
  prompt,
  records,
  totalRecordCount = records.length,
}: {
  env: CloudflareEnv;
  previousTitle?: string | null;
  prompt: string;
  records: CardLlmRecord[];
  totalRecordCount?: number;
}) => {
  if (!records.length) {
    throw new Error('Card generation requires source records');
  }

  const defaultTitle = defaultTitleFromPrompt(prompt);

  const messages = buildMessages({
    previousTitle,
    prompt,
    records,
    totalRecordCount,
  });

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
      previousTitle,
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
      title: previousTitle ?? defaultTitleFromPrompt(prompt),
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
    title: previousTitle ?? defaultTitleFromPrompt(prompt),
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
  const defaultTitle = previousTitle ?? defaultTitleFromPrompt(prompt);
  if (!records.length) throw new Error('Card tweak requires source records');

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
      repairMessage: `${parsedResult.errorMessage}. Return { "title"?: string, "updatedPrompt": string, "output": object } again. Apply only the requested tweak, include a standalone updatedPrompt for future refreshes, and keep the result grounded in the provided records.`,
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
    content:
      'You help create concise llog progress card prompts. Return only valid JSON. Do not duplicate existing cards. Suggest a useful progress view that can be answered from the provided records. Favor prompts that produce a concrete chart, metric, milestone list, or focused summary; avoid vague analysis prompts.',
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
          'one concise editable prompt, 1-2 sentences, at most 500 characters, asking for a distinct progress view',
      },
      outputRules:
        'Return one user-editable prompt, not JSON instructions. Mention the specific progress signal, timeframe, comparison, or milestone pattern the card should track when the records support one. Keep it distinct from existing card titles/prompts.',
      records: records.map((record) => ({
        date: record.date ?? null,
        id: record.id,
        tags: record.tags?.map((tag) => tag.name).filter(Boolean) ?? [],
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
