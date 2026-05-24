import type { CardBlueprint } from '@/domain/cards/blueprint';
import * as cardAnalysis from '@/domain/cards/analysis';
import * as cardOutput from '@/domain/cards/output';
import { readExtractedFacts } from './openrouter/facts';
import { requestOpenRouterJson } from './openrouter/request';
import type { CardContextCard, CardLlmRecord } from './openrouter/types';
import * as prompts from './openrouter/prompts';
import * as results from './openrouter/results';
import * as schemas from './openrouter/schemas';
import * as utils from './openrouter/utils';

export type { CardContextCard, CardLlmRecord };

export const planCardAnalysis = async ({
  env,
  generationTime,
  prompt,
  records,
  totalRecordCount = records.length,
}: {
  env: CloudflareEnv;
  generationTime?: string;
  prompt: string;
  records: CardLlmRecord[];
  totalRecordCount?: number;
}) => {
  const parsedJson = await requestOpenRouterJson({
    env,
    messages: prompts.buildAnalysisPlanMessages({
      generationTime,
      prompt,
      records,
      totalRecordCount,
    }),
    operation: 'analysis planning',
    responseSchema: schemas.analysisPlanResponseSchema,
  });

  const root = utils.asRecord(parsedJson);
  const parsedMode = utils.getString(root.mode);

  const analysisSpec = cardAnalysis.normalizeAnalysisSpec(
    utils.cleanNullableObject(root.analysisSpec)
  );

  return cardAnalysis.planCardAnalysis({
    analysisSpec,
    generationTime,
    mode:
      parsedMode === 'exact' || parsedMode === 'narrative'
        ? parsedMode
        : undefined,
    prompt,
    totalMatchingRecords: totalRecordCount,
  });
};

export const extractRecordFacts = async ({
  analysisSpec,
  env,
  records,
}: {
  analysisSpec: cardAnalysis.CardAnalysisSpec;
  env: CloudflareEnv;
  records: CardLlmRecord[];
}) => {
  if (!records.length) return [];

  const parsedJson = await requestOpenRouterJson({
    env,
    messages: prompts.buildExtractionMessages({ analysisSpec, records }),
    operation: 'fact extraction',
    responseSchema: schemas.extractedFactsResponseSchema,
  });

  try {
    return readExtractedFacts({ analysisSpec, parsedJson, records });
  } catch (error) {
    const repairedJson = await requestOpenRouterJson({
      env,
      messages: prompts.buildExtractionMessages({
        analysisSpec,
        records,
        repairMessage: `${error instanceof Error ? error.message : 'Fact extraction shape was invalid'}. Return exactly one records item for every input recordIndex from 1 to ${records.length}, with no missing or duplicate indexes. Use empty arrays for records with no matching facts.`,
      }),
      operation: 'fact extraction',
      responseSchema: schemas.extractedFactsResponseSchema,
    });

    return readExtractedFacts({
      analysisSpec,
      parsedJson: repairedJson,
      records,
    });
  }
};

export const generateCardResult = async ({
  analysisMode,
  blueprint,
  env,
  existingCards,
  exactFacts,
  prompt,
  records,
  totalRecordCount = records.length,
}: {
  analysisMode?: cardAnalysis.CardAnalysisMode;
  blueprint?: CardBlueprint;
  env: CloudflareEnv;
  existingCards?: CardContextCard[];
  exactFacts?: cardAnalysis.ExactCardFacts;
  prompt: string;
  records: CardLlmRecord[];
  totalRecordCount?: number;
}) => {
  if (!records.length) {
    throw new Error('Card generation requires source records');
  }

  const lockedExactFacts = analysisMode === 'exact' ? exactFacts : undefined;
  const defaultTitle = utils.defaultTitleFromPrompt(prompt);

  const messages = prompts.buildMessages({
    analysisMode,
    blueprint,
    existingCards,
    exactFacts: lockedExactFacts,
    prompt,
    records,
    totalRecordCount,
  });

  const parsedJson = await requestOpenRouterJson({
    env,
    messages,
    operation: 'card generation',
    responseSchema: schemas.generatedCardResponseSchema,
  });

  const parsedResult = results.parseGeneratedCardResult({
    defaultTitle,
    exactFacts: lockedExactFacts,
    parsedJson,
  });

  if (parsedResult.success) return parsedResult;

  const repairedJson = await requestOpenRouterJson({
    env,
    messages: prompts.buildMessages({
      analysisMode,
      blueprint,
      existingCards,
      exactFacts: lockedExactFacts,
      prompt,
      records,
      totalRecordCount,
      repairMessage: `${parsedResult.errorMessage}. Try again with at least one non-empty chart, metrics, milestones, or summary section based only on ${lockedExactFacts ? 'exactFacts and the provided sampled records' : 'the provided records'}. ${lockedExactFacts ? 'Keep exactFacts locked.' : ''}`,
    }),
    operation: 'card generation',
    responseSchema: schemas.generatedCardResponseSchema,
  });

  const repairedResult = results.parseGeneratedCardResult({
    defaultTitle,
    exactFacts: lockedExactFacts,
    parsedJson: repairedJson,
  });

  if (!repairedResult.success) throw new Error(repairedResult.errorMessage);
  return repairedResult;
};

export const refreshCardResult = async ({
  analysisMode,
  env,
  exactFacts,
  previousOutput,
  previousTitle,
  prompt,
  records,
  totalRecordCount = records.length,
}: {
  analysisMode?: cardAnalysis.CardAnalysisMode;
  env: CloudflareEnv;
  exactFacts?: cardAnalysis.ExactCardFacts;
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  records: CardLlmRecord[];
  totalRecordCount?: number;
}) => {
  if (!records.length) throw new Error('Card refresh requires source records');
  const lockedExactFacts = analysisMode === 'exact' ? exactFacts : undefined;

  const messages = prompts.buildRefreshMessages({
    analysisMode,
    exactFacts: lockedExactFacts,
    previousOutput,
    previousTitle,
    prompt,
    records,
    totalRecordCount,
  });

  const parsedJson = await requestOpenRouterJson({
    env,
    messages,
    operation: 'card refresh',
    responseSchema: schemas.refreshedCardResponseSchema,
  });

  const parsedResult = results.parseCardOutputResult({
    exactFacts: lockedExactFacts,
    parsedJson,
  });

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
    messages: prompts.buildRefreshMessages({
      analysisMode,
      exactFacts: lockedExactFacts,
      previousOutput,
      previousTitle,
      prompt,
      records,
      repairMessage: `${parsedResult.errorMessage}. Try again. Preserve the existing output shape unless locked exactFacts require an update, and curate milestones only within an existing milestone section based on ${lockedExactFacts ? 'exactFacts and the provided sampled records' : 'the provided records'}. ${lockedExactFacts ? 'Keep exactFacts locked.' : ''}`,
      totalRecordCount,
    }),
    operation: 'card refresh',
    responseSchema: schemas.refreshedCardResponseSchema,
  });

  const repairedResult = results.parseCardOutputResult({
    exactFacts: lockedExactFacts,
    parsedJson: repairedJson,
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
  analysisMode,
  env,
  exactFacts,
  previousOutput,
  previousTitle,
  prompt,
  records,
  totalRecordCount = records.length,
  tweakPrompt,
}: {
  analysisMode?: cardAnalysis.CardAnalysisMode;
  env: CloudflareEnv;
  exactFacts?: cardAnalysis.ExactCardFacts;
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  records: CardLlmRecord[];
  totalRecordCount?: number;
  tweakPrompt: string;
}) => {
  if (!records.length) throw new Error('Card tweak requires source records');
  const lockedExactFacts = analysisMode === 'exact' ? exactFacts : undefined;
  const defaultTitle = previousTitle ?? utils.defaultTitleFromPrompt(prompt);

  const messages = prompts.buildTweakMessages({
    analysisMode,
    exactFacts: lockedExactFacts,
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
    operation: 'card tweak',
    responseSchema: schemas.tweakedCardResponseSchema,
  });

  const parsedResult = results.parseTweakedCardResult({
    defaultTitle,
    exactFacts: lockedExactFacts,
    parsedJson,
  });

  if (parsedResult.success) return parsedResult;

  const repairedJson = await requestOpenRouterJson({
    env,
    messages: prompts.buildTweakMessages({
      analysisMode,
      exactFacts: lockedExactFacts,
      previousOutput,
      previousTitle,
      prompt,
      records,
      repairMessage: `${parsedResult.errorMessage}. Try again. Apply only the requested tweak and keep the result grounded in ${lockedExactFacts ? 'exactFacts and the provided sampled records' : 'the provided records'}. ${lockedExactFacts ? 'Keep exactFacts locked.' : ''}`,
      totalRecordCount,
      tweakPrompt,
    }),
    operation: 'card tweak',
    responseSchema: schemas.tweakedCardResponseSchema,
  });

  const repairedResult = results.parseTweakedCardResult({
    defaultTitle,
    exactFacts: lockedExactFacts,
    parsedJson: repairedJson,
  });

  if (!repairedResult.success) throw new Error(repairedResult.errorMessage);
  return repairedResult;
};

export const generateCardPromptSuggestion = async ({
  env,
  existingCards,
  records,
}: {
  env: CloudflareEnv;
  existingCards: CardContextCard[];
  records: CardLlmRecord[];
}) => {
  const parsedJson = await requestOpenRouterJson({
    env,
    messages: prompts.buildPromptSuggestionMessages({ existingCards, records }),
    operation: 'card prompt suggestion',
    responseSchema: schemas.promptSuggestionResponseSchema,
  });

  const prompt = utils.getString(utils.asRecord(parsedJson).prompt)?.trim();

  if (!prompt) {
    throw new Error('OpenRouter card prompt suggestion returned no prompt');
  }

  return prompt.slice(0, 500);
};
