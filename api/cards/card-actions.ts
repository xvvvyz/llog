import type { Db } from '@/api/middleware/db';
import * as openrouter from '@/api/cards/openrouter';
import { enqueueJob } from '@/api/jobs/payload';
import * as cardAnalysis from '@/domain/cards/analysis';
import * as cardBlueprint from '@/domain/cards/blueprint';
import * as constants from '@/domain/cards/constants';
import * as cardOutput from '@/domain/cards/output';
import * as cardSourceAssembly from '@/domain/cards/source-assembly';
import * as cardSourceSelection from '@/domain/cards/source-selection';
import * as cardTitle from '@/domain/cards/title';
import * as recordStatus from '@/domain/records/status';
import * as permissions from '@/domain/teams/permissions';
import { id as generateId, lookup } from '@instantdb/admin';
import { HTTPException } from 'hono/http-exception';
import type * as instantEntities from '@/instant.entities';
import * as query2 from '@/domain/records/query';

export const CARD_TITLE_MAX_LENGTH = cardTitle.CARD_TITLE_MAX_LENGTH;

export const CARD_TWEAK_PROMPT_MAX_LENGTH = 1000;

export const MAX_CARD_TAGS = 20;

export const CARD_REFRESH_DEBOUNCE_MS = 10_000;

export const CARD_GENERATION_FAILURE_RETRY_DELAY_SECONDS = 60;

export type CardWriteInput = { prompt: string; tagIds: string[] };

export type CardCreateInput = CardWriteInput & { logId: string };

export type CardPromptSuggestionInput = {
  cardId?: string;
  logId: string;
  tagIds: string[];
};

export type CardTweakInput = { prompt: string };

export type CardRecordRefreshInput = { recordId: string; tagIds?: string[] };

type LogAccess = {
  actorRole?: string | null;
  isLogMember: boolean;
  logId: string;
  teamId: string;
};

type EntityProjection<T extends { id: string }, K extends keyof T> = Pick<
  T,
  'id'
> &
  Partial<Pick<T, K>>;

type CardTag = Pick<instantEntities.Tag, 'id'> &
  Partial<Pick<instantEntities.Tag, 'name'>>;

type CardEntity = Omit<
  EntityProjection<
    instantEntities.Card,
    | 'blueprint'
    | 'generationRequestedAt'
    | 'isGenerating'
    | 'logId'
    | 'order'
    | 'output'
    | 'prompt'
    | 'sourceFingerprint'
    | 'teamId'
    | 'title'
  >,
  'blueprint' | 'generationRequestedAt' | 'output'
> & {
  blueprint?: unknown;
  generationRequestedAt?: Date | number | string | null;
  output?: unknown;
  sourceFingerprint?: string | null;
  tags?: CardTag[];
};

type AnalysisJobType = 'generate' | 'refresh' | 'tweak';

type AnalysisEntity = Omit<
  EntityProjection<
    instantEntities.Analysis,
    'analysisSpec' | 'jobType' | 'tweakPrompt'
  >,
  'analysisSpec' | 'jobType'
> & { analysisSpec?: unknown; jobType?: AnalysisJobType | null };

type FactEntity = Pick<instantEntities.Fact, 'data' | 'id' | 'key'>;

type AnalysisCleanupCard = Pick<CardEntity, 'id'> & {
  analyses?: Pick<instantEntities.Analysis, 'id'>[];
  facts?: Pick<instantEntities.Fact, 'id' | 'key'>[];
};

type PublishedCardSourceRecord = cardSourceAssembly.AssembledCardSourceRecord;

type FileCardRefreshSourceRecord = EntityProjection<
  instantEntities.Record,
  'logId' | 'status'
> & {
  log?: Pick<instantEntities.Log, 'id'> | null;
  tags?: Pick<instantEntities.Tag, 'id'>[];
};

type FileCardRefreshSource = Pick<instantEntities.FileItem, 'id'> & {
  record?: FileCardRefreshSourceRecord | null;
  reply?:
    | (EntityProjection<instantEntities.Reply, 'isDraft'> & {
        record?: FileCardRefreshSourceRecord | null;
      })
    | null;
};

const cardSourceFileQuery = {
  $: {
    fields: [
      'id' as const,
      'order' as const,
      'transcript' as const,
      'type' as const,
    ],
  },
};

const trimRequired = (value: string, maxLength: number, message: string) => {
  const trimmed = value.trim();

  if (!trimmed || trimmed.length > maxLength) {
    throw new HTTPException(400, { message });
  }

  return trimmed;
};

export const normalizeCardWriteInput = <T extends CardWriteInput>(
  input: T
) => ({
  ...input,
  prompt: trimRequired(
    input.prompt,
    constants.CARD_PROMPT_MAX_LENGTH,
    'Invalid prompt'
  ),
  tagIds: cardSourceSelection.uniqueCardTagIds(input.tagIds),
});

export const canManageCards = ({ actorRole }: Pick<LogAccess, 'actorRole'>) =>
  permissions.canManageTeam(actorRole);

export const canViewCards = ({
  actorRole,
  isLogMember,
}: Pick<LogAccess, 'actorRole' | 'isLogMember'>) =>
  permissions.canManageTeam(actorRole) || isLogMember;

export const canRefreshRecordCards = ({
  actorRole,
  isAuthor,
}: {
  actorRole?: string | null;
  isAuthor: boolean;
}) => (!!actorRole && isAuthor) || permissions.canManageTeam(actorRole);

const assertCanManageCards = (access: Pick<LogAccess, 'actorRole'>) => {
  if (!canManageCards(access)) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }
};

const getLogAccess = async ({
  dbClient,
  logId,
  userId,
}: {
  dbClient: Db;
  logId: string;
  userId: string;
}): Promise<LogAccess> => {
  const { logs } = await dbClient.query({
    logs: {
      $: { fields: ['id', 'teamId'], where: { id: logId } },
      profiles: { user: { $: { fields: ['id'] } } },
      team: { roles: { $: { fields: ['role', 'userId'], where: { userId } } } },
    },
  });

  const log = logs[0];

  if (!log?.id || !log.teamId) {
    throw new HTTPException(404, { message: 'Log not found' });
  }

  return {
    actorRole: log.team?.roles?.[0]?.role,
    isLogMember: !!log.profiles?.some((profile) => profile.user?.id === userId),
    logId: log.id,
    teamId: log.teamId,
  };
};

const getManageableLogAccess = async (params: {
  dbClient: Db;
  logId: string;
  userId: string;
}) => {
  const access = await getLogAccess(params);
  assertCanManageCards(access);
  return access;
};

const getCardOrThrow = async ({
  cardId,
  dbClient,
}: {
  cardId: string;
  dbClient: Db;
}) => {
  const { cards } = await dbClient.query({
    cards: {
      $: { where: { id: cardId } },
      tags: { $: { fields: ['id', 'name'] } },
    },
  });

  const card = cards[0] as CardEntity | undefined;
  if (!card?.id) throw new HTTPException(404, { message: 'Card not found' });
  return card;
};

const getManageableCard = async ({
  cardId,
  dbClient,
  userId,
}: {
  cardId: string;
  dbClient: Db;
  userId: string;
}) => {
  const card = await getCardOrThrow({ cardId, dbClient });
  if (!card.logId) throw new HTTPException(404, { message: 'Card not found' });
  await getManageableLogAccess({ dbClient, logId: card.logId, userId });
  return card;
};

const validateCardTags = async ({
  dbClient,
  logId,
  tagIds,
  teamId,
}: {
  dbClient: Db;
  logId: string;
  tagIds: string[];
  teamId: string;
}) => {
  if (!tagIds.length || tagIds.length > MAX_CARD_TAGS) {
    throw new HTTPException(400, { message: 'Select at least one source tag' });
  }

  const { tags } = await dbClient.query({
    tags: {
      $: { fields: ['id', 'teamId', 'type'], where: { id: { $in: tagIds } } },
      logs: { $: { fields: ['id'] } },
    },
  });

  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

  for (const tagId of tagIds) {
    const tag = tagsById.get(tagId);

    if (
      !tag ||
      tag.type !== 'record' ||
      tag.teamId !== teamId ||
      !tag.logs?.some((log) => log.id === logId)
    ) {
      throw new HTTPException(400, { message: 'Invalid source tags' });
    }
  }

  return tagIds;
};

const getNextCardOrder = async ({
  dbClient,
  logId,
}: {
  dbClient: Db;
  logId: string;
}) => {
  const { cards } = await dbClient.query({
    cards: {
      $: { fields: ['order'], order: { order: 'desc' }, where: { logId } },
    },
  });

  const highestOrder = Math.max(
    0,
    ...(cards ?? []).map((card) =>
      typeof card.order === 'number' ? card.order : 0
    )
  );

  return highestOrder + 1;
};

export const CARD_GENERATION_ERROR_MESSAGE = 'Failed to generate card.';

const timeValue = (value?: Date | number | string | null) => {
  if (value == null) return;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : undefined;
};

export const isSameGenerationRequest = ({
  generationRequestedAt,
  requestedAt,
}: {
  generationRequestedAt?: Date | number | string | null;
  requestedAt: string;
}) => timeValue(generationRequestedAt) === timeValue(requestedAt);

const readCardOutput = (value: unknown) => {
  const parsed = cardOutput.validateCardOutput(value);
  return parsed.success ? parsed.data : undefined;
};

const getPublishedTaggedSourceRecords = async ({
  dbClient,
  logId,
  tagIds,
}: {
  dbClient: Db;
  logId: string;
  tagIds: string[];
}) => {
  if (!tagIds.length) return [];

  const { records } = await dbClient.query({
    records: {
      $: {
        fields: ['date', 'id', 'logId', 'status', 'text'],
        order: { date: 'asc' },
        where: {
          ...query2.publishedRecordWhere,
          'tags.id': { $in: tagIds },
          logId,
        },
      },
      author: { $: { fields: ['id' as const, 'name' as const] } },
      files: cardSourceFileQuery,
      replies: {
        $: {
          fields: [
            'date' as const,
            'id' as const,
            'isDraft' as const,
            'text' as const,
          ],
          order: { date: 'asc' as const },
          where: query2.publishedReplyWhere,
        },
        author: { $: { fields: ['id' as const, 'name' as const] } },
        files: cardSourceFileQuery,
      },
      tags: { $: { fields: ['id', 'name'] } },
    },
  });

  return cardSourceAssembly.assembleCardLlmRecords(
    records as cardSourceAssembly.CardSourceAssemblyRecord[]
  );
};

const noSourceRecordGenerationFields = ({
  previousOutput,
  prompt,
  sourceFingerprint,
  title,
}: {
  previousOutput?: unknown;
  prompt: string;
  sourceFingerprint?: string;
  title?: string;
}) => ({
  generationRequestedAt: null,
  isGenerating: false,
  lastGeneratedAt: null,
  ...(previousOutput != null && { output: null }),
  ...(sourceFingerprint && { sourceFingerprint }),
  title: title ?? cardTitle.fallbackCardTitle(prompt),
});

const CARD_GENERATION_CONTEXT_CARD_LIMIT = 8;

const hasExactCardTagMatch = (
  cardTags: CardEntity['tags'] | undefined,
  tagIds: string[]
) => {
  const selectedTagIds = new Set(tagIds);
  const cardTagIds = cardTags?.map((tag) => tag.id).filter(Boolean) ?? [];
  const cardTagIdSet = new Set(cardTagIds);
  if (cardTagIdSet.size !== selectedTagIds.size) return false;
  return [...selectedTagIds].every((tagId) => cardTagIdSet.has(tagId));
};

const getGenerationContextCards = async ({
  cardId,
  dbClient,
  logId,
  tagIds,
}: {
  cardId: string;
  dbClient: Db;
  logId: string;
  tagIds: string[];
}) => {
  const { cards } = await dbClient.query({
    cards: {
      $: {
        fields: ['id', 'order', 'output', 'prompt', 'title'],
        where: { logId, type: constants.CARD_TYPE_PROGRESS },
      },
      tags: { $: { fields: ['id'] } },
    },
  });

  return (cards as CardEntity[])
    .filter(
      (card) =>
        !!card.id &&
        card.id !== cardId &&
        hasExactCardTagMatch(card.tags, tagIds)
    )
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .slice(0, CARD_GENERATION_CONTEXT_CARD_LIMIT);
};

type CardAnalysisContext = {
  exactFacts?: cardAnalysis.ExactCardFacts;
  plan: cardAnalysis.CardAnalysisPlan;
  sourceFingerprint: string;
  sourceRecords: PublishedCardSourceRecord[];
  sourceSelection: {
    records: PublishedCardSourceRecord[];
    totalMatchingRecords: number;
  };
};

const planCardAnalysisForContext = async ({
  env,
  generationTime,
  prompt,
  sourceRecords,
}: {
  env?: CloudflareEnv;
  generationTime: string;
  prompt: string;
  sourceRecords: PublishedCardSourceRecord[];
}) => {
  const localPlan = cardAnalysis.planCardAnalysis({
    generationTime,
    prompt,
    totalMatchingRecords: sourceRecords.length,
  });

  const shouldRequestPlan =
    cardAnalysis.promptRequestsExactCandidate(prompt) &&
    sourceRecords.length > 0;

  if (!shouldRequestPlan) return localPlan;
  if (!env) throw new Error('Exact analysis planning requires env');

  return openrouter.planCardAnalysis({
    env,
    generationTime,
    prompt,
    records: sourceRecords,
    totalRecordCount: sourceRecords.length,
  });
};

const getCardAnalysisContext = async ({
  allSourceRecords,
  analysisPlan,
  dbClient,
  env,
  generationTime,
  logId,
  prompt,
  sourceFingerprint: existingSourceFingerprint,
  tagIds,
}: {
  allSourceRecords?: PublishedCardSourceRecord[];
  analysisPlan?: cardAnalysis.CardAnalysisPlan;
  dbClient: Db;
  env?: CloudflareEnv;
  generationTime: string;
  logId: string;
  prompt: string;
  sourceFingerprint?: string;
  tagIds: string[];
}): Promise<CardAnalysisContext> => {
  const records =
    allSourceRecords ??
    (await getPublishedTaggedSourceRecords({ dbClient, logId, tagIds }));

  const sourceFingerprint =
    existingSourceFingerprint ??
    cardAnalysis.cardSourceFingerprint({
      generationTime,
      prompt,
      records,
      selectedTagIds: tagIds,
    });

  const plan =
    analysisPlan ??
    (await planCardAnalysisForContext({
      env,
      generationTime,
      prompt,
      sourceRecords: records,
    }));

  const sourceRecords =
    plan.mode === 'exact'
      ? cardAnalysis.selectExactRecords(records, {
          analysisSpec: plan.analysisSpec,
          generationTime,
        })
      : records;

  const sourceSelection = cardSourceSelection.selectCardSourceRecordCoverage({
    records: sourceRecords,
    tagIds,
  });

  return { plan, sourceFingerprint, sourceRecords, sourceSelection };
};

const getCardSourceFingerprintContext = async ({
  dbClient,
  generationTime,
  logId,
  prompt,
  tagIds,
}: {
  dbClient: Db;
  generationTime: string;
  logId: string;
  prompt: string;
  tagIds: string[];
}) => {
  const allSourceRecords = await getPublishedTaggedSourceRecords({
    dbClient,
    logId,
    tagIds,
  });

  return {
    allSourceRecords,
    sourceFingerprint: cardAnalysis.cardSourceFingerprint({
      generationTime,
      prompt,
      records: allSourceRecords,
      selectedTagIds: tagIds,
    }),
  };
};

const cardSourceFingerprintMatches = ({
  card,
  sourceFingerprint,
}: {
  card: Pick<CardEntity, 'sourceFingerprint'>;
  sourceFingerprint: string;
}) => !!card.sourceFingerprint && card.sourceFingerprint === sourceFingerprint;

const withAnalysisSpec = (plan: cardAnalysis.CardAnalysisPlan) => {
  if (plan.mode !== 'exact' || !plan.analysisSpec) {
    throw new Error('Exact analysis requires an analysis spec');
  }

  return plan.analysisSpec;
};

const generateCardResult = async ({
  analysisContext,
  blueprint,
  cardId,
  dbClient,
  env,
  generationTime,
  logId,
  prompt,
  tagIds,
}: {
  analysisContext?: CardAnalysisContext;
  blueprint?: cardBlueprint.CardBlueprint;
  cardId: string;
  dbClient: Db;
  env: CloudflareEnv;
  generationTime?: string;
  logId: string;
  prompt: string;
  tagIds: string[];
}) => {
  const resolvedGenerationTime = generationTime ?? new Date().toISOString();

  const context =
    analysisContext ??
    (await getCardAnalysisContext({
      dbClient,
      env,
      generationTime: resolvedGenerationTime,
      logId,
      prompt,
      tagIds,
    }));

  const sourceSelection = context.sourceSelection;
  if (!sourceSelection.records.length) return null;

  const existingCards = await getGenerationContextCards({
    cardId,
    dbClient,
    logId,
    tagIds,
  });

  return openrouter.generateCardResult({
    analysisMode: context.plan.mode,
    blueprint,
    env,
    exactFacts: context.exactFacts,
    existingCards,
    generationTime: resolvedGenerationTime,
    prompt,
    records: sourceSelection.records,
    totalRecordCount: sourceSelection.totalMatchingRecords,
  });
};

const refreshCardResult = async ({
  analysisContext,
  dbClient,
  env,
  generationTime,
  logId,
  previousOutput,
  previousTitle,
  prompt,
  tagIds,
}: {
  analysisContext?: CardAnalysisContext;
  dbClient: Db;
  env: CloudflareEnv;
  generationTime?: string;
  logId: string;
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  tagIds: string[];
}) => {
  const resolvedGenerationTime = generationTime ?? new Date().toISOString();

  const context =
    analysisContext ??
    (await getCardAnalysisContext({
      dbClient,
      env,
      generationTime: resolvedGenerationTime,
      logId,
      prompt,
      tagIds,
    }));

  const sourceSelection = context.sourceSelection;
  if (!sourceSelection.records.length) return null;

  return openrouter.refreshCardResult({
    analysisMode: context.plan.mode,
    env,
    exactFacts: context.exactFacts,
    generationTime: resolvedGenerationTime,
    previousOutput,
    previousTitle,
    prompt,
    records: sourceSelection.records,
    totalRecordCount: sourceSelection.totalMatchingRecords,
  });
};

const tweakCardResult = async ({
  analysisContext,
  dbClient,
  env,
  generationTime,
  logId,
  previousOutput,
  previousTitle,
  prompt,
  tagIds,
  tweakPrompt,
}: {
  analysisContext?: CardAnalysisContext;
  dbClient: Db;
  env: CloudflareEnv;
  generationTime?: string;
  logId: string;
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  tagIds: string[];
  tweakPrompt: string;
}) => {
  const resolvedGenerationTime = generationTime ?? new Date().toISOString();

  const context =
    analysisContext ??
    (await getCardAnalysisContext({
      dbClient,
      env,
      generationTime: resolvedGenerationTime,
      logId,
      prompt,
      tagIds,
    }));

  const sourceSelection = context.sourceSelection;
  if (!sourceSelection.records.length) return null;

  return openrouter.tweakCardResult({
    analysisMode: context.plan.mode,
    env,
    exactFacts: context.exactFacts,
    generationTime: resolvedGenerationTime,
    previousOutput,
    previousTitle,
    prompt,
    records: sourceSelection.records,
    totalRecordCount: sourceSelection.totalMatchingRecords,
    tweakPrompt,
  });
};

export const suggestCardPrompt = async ({
  dbClient,
  env,
  input,
  userId,
}: {
  dbClient: Db;
  env: CloudflareEnv;
  input: CardPromptSuggestionInput;
  userId: string;
}) => {
  const access = await getManageableLogAccess({
    dbClient,
    logId: input.logId,
    userId,
  });

  const tagIds = await validateCardTags({
    dbClient,
    logId: access.logId,
    tagIds: cardSourceSelection.uniqueCardTagIds(input.tagIds),
    teamId: access.teamId,
  });

  const sourceRecords = await getPublishedTaggedSourceRecords({
    dbClient,
    logId: access.logId,
    tagIds,
  });

  const records = cardSourceSelection.selectCardPromptSuggestionRecords({
    records: sourceRecords,
    tagIds,
  });

  const { cards } = await dbClient.query({
    cards: {
      $: {
        fields: ['id', 'prompt', 'title'],
        where: { logId: access.logId, type: constants.CARD_TYPE_PROGRESS },
      },
      tags: { $: { fields: ['id', 'name'] } },
    },
  });

  const existingCards = (cards as CardEntity[]).filter(
    (card) => card.id !== input.cardId
  );

  const prompt = await openrouter.generateCardPromptSuggestion({
    env,
    existingCards,
    records,
  });

  return { prompt };
};

const updateCardIfGenerationCurrent = async ({
  cardId,
  dbClient,
  fields,
  requestedAt,
}: {
  cardId: string;
  dbClient: Db;
  fields: Record<string, unknown>;
  requestedAt: string;
}) => {
  const { cards } = await dbClient.query({
    cards: { $: { fields: ['generationRequestedAt'], where: { id: cardId } } },
  });

  const card = cards[0] as CardEntity | undefined;

  if (
    !card?.id ||
    !isSameGenerationRequest({
      generationRequestedAt: card.generationRequestedAt,
      requestedAt,
    })
  ) {
    return false;
  }

  await dbClient.transact(dbClient.tx.cards[cardId].update(fields));
  return true;
};

const writeNoSourceRecordGenerationResult = async ({
  cardId,
  dbClient,
  previousOutput,
  prompt,
  requestedAt,
  sourceFingerprint,
  title,
}: {
  cardId: string;
  dbClient: Db;
  previousOutput?: unknown;
  prompt: string;
  requestedAt: string;
  sourceFingerprint?: string;
  title?: string;
}) => {
  const didWrite = await updateCardIfGenerationCurrent({
    cardId,
    dbClient,
    fields: noSourceRecordGenerationFields({
      previousOutput,
      prompt,
      sourceFingerprint,
      ...(title && { title }),
    }),
    requestedAt,
  });

  return { empty: true, stale: !didWrite, success: didWrite };
};

const markCardGenerationFailed = ({
  cardId,
  dbClient,
  requestedAt,
}: {
  cardId: string;
  dbClient: Db;
  requestedAt: string;
}) =>
  updateCardIfGenerationCurrent({
    cardId,
    dbClient,
    fields: {
      error: CARD_GENERATION_ERROR_MESSAGE,
      generationRequestedAt: null,
      isGenerating: false,
    },
    requestedAt,
  });

export const generateCard = async ({
  cardId,
  dbClient,
  env,
  isFinalAttempt,
  requestedAt,
}: {
  cardId: string;
  dbClient: Db;
  env: CloudflareEnv;
  isFinalAttempt?: boolean;
  requestedAt: string;
}) => {
  const card = await getCardOrThrow({ cardId, dbClient });

  if (
    !isSameGenerationRequest({
      generationRequestedAt: card.generationRequestedAt,
      requestedAt,
    })
  ) {
    return { stale: true, success: false };
  }

  if (!card.logId || !card.prompt) {
    await markCardGenerationFailed({ cardId, dbClient, requestedAt });
    return { error: CARD_GENERATION_ERROR_MESSAGE, success: false };
  }

  const blueprint = cardBlueprint.readCardBlueprint(card.blueprint);
  const currentTitle = card.title?.trim() || undefined;

  try {
    const tagIds = card.tags?.map((tag) => tag.id) ?? [];

    const analysisContext = await getCardAnalysisContext({
      dbClient,
      env,
      generationTime: requestedAt,
      logId: card.logId,
      prompt: card.prompt,
      tagIds,
    });

    if (!analysisContext.sourceSelection.records.length) {
      return writeNoSourceRecordGenerationResult({
        cardId,
        dbClient,
        previousOutput: card.output,
        prompt: card.prompt,
        requestedAt,
        sourceFingerprint: analysisContext.sourceFingerprint,
        ...(blueprint && currentTitle && { title: currentTitle }),
      });
    }

    if (analysisContext.plan.mode === 'exact') {
      return startExactAnalysis({
        analysisContext,
        cardId,
        dbClient,
        env,
        jobType: 'generate',
        requestedAt,
      });
    }

    const result = await generateCardResult({
      analysisContext,
      blueprint,
      dbClient,
      env,
      cardId: card.id,
      generationTime: requestedAt,
      logId: card.logId,
      prompt: card.prompt,
      tagIds,
    });

    if (!result) {
      return writeNoSourceRecordGenerationResult({
        cardId,
        dbClient,
        previousOutput: card.output,
        prompt: card.prompt,
        requestedAt,
        sourceFingerprint: analysisContext.sourceFingerprint,
        ...(blueprint && currentTitle && { title: currentTitle }),
      });
    }

    const title = blueprint && currentTitle ? currentTitle : result.title;

    const didWrite = await updateCardIfGenerationCurrent({
      cardId,
      dbClient,
      fields: {
        generationRequestedAt: null,
        isGenerating: false,
        lastGeneratedAt: new Date().toISOString(),
        blueprint: null,
        output: result.output,
        sourceFingerprint: analysisContext.sourceFingerprint,
        title,
      },
      requestedAt,
    });

    return {
      output: result.output,
      stale: !didWrite,
      success: didWrite,
      title,
    };
  } catch (error) {
    console.error('Card generation failed', { cardId, error });

    if (isFinalAttempt) {
      await markCardGenerationFailed({ cardId, dbClient, requestedAt });
      return { error: CARD_GENERATION_ERROR_MESSAGE, success: false };
    }

    return {
      error: CARD_GENERATION_ERROR_MESSAGE,
      retryAfterSeconds: CARD_GENERATION_FAILURE_RETRY_DELAY_SECONDS,
      success: false,
    };
  }
};

export const refreshCard = async ({
  cardId,
  dbClient,
  env,
  isFinalAttempt,
  requestedAt,
}: {
  cardId: string;
  dbClient: Db;
  env: CloudflareEnv;
  isFinalAttempt?: boolean;
  requestedAt: string;
}) => {
  const card = await getCardOrThrow({ cardId, dbClient });

  if (
    !isSameGenerationRequest({
      generationRequestedAt: card.generationRequestedAt,
      requestedAt,
    })
  ) {
    return { stale: true, success: false };
  }

  if (!card.logId || !card.prompt) {
    await markCardGenerationFailed({ cardId, dbClient, requestedAt });
    return { error: CARD_GENERATION_ERROR_MESSAGE, success: false };
  }

  const previousOutput = readCardOutput(card.output);

  if (!previousOutput) {
    return generateCard({ cardId, dbClient, env, isFinalAttempt, requestedAt });
  }

  try {
    const tagIds = card.tags?.map((tag) => tag.id) ?? [];

    const { allSourceRecords, sourceFingerprint } =
      await getCardSourceFingerprintContext({
        dbClient,
        generationTime: requestedAt,
        logId: card.logId,
        prompt: card.prompt,
        tagIds,
      });

    if (cardSourceFingerprintMatches({ card, sourceFingerprint })) {
      const didWrite = await updateCardIfGenerationCurrent({
        cardId,
        dbClient,
        fields: { error: '', generationRequestedAt: null, isGenerating: false },
        requestedAt,
      });

      return { skipped: true, stale: !didWrite, success: didWrite };
    }

    const analysisContext = await getCardAnalysisContext({
      allSourceRecords,
      dbClient,
      env,
      generationTime: requestedAt,
      logId: card.logId,
      prompt: card.prompt,
      sourceFingerprint,
      tagIds,
    });

    if (!analysisContext.sourceSelection.records.length) {
      return writeNoSourceRecordGenerationResult({
        cardId,
        dbClient,
        previousOutput: card.output,
        prompt: card.prompt,
        requestedAt,
        sourceFingerprint: analysisContext.sourceFingerprint,
      });
    }

    if (analysisContext.plan.mode === 'exact') {
      return startExactAnalysis({
        analysisContext,
        cardId,
        dbClient,
        env,
        jobType: 'refresh',
        requestedAt,
      });
    }

    const result = await refreshCardResult({
      analysisContext,
      dbClient,
      env,
      generationTime: requestedAt,
      logId: card.logId,
      previousOutput,
      previousTitle: card.title,
      prompt: card.prompt,
      tagIds,
    });

    if (!result) {
      return writeNoSourceRecordGenerationResult({
        cardId,
        dbClient,
        previousOutput: card.output,
        prompt: card.prompt,
        requestedAt,
        sourceFingerprint: analysisContext.sourceFingerprint,
      });
    }

    const didWrite = await updateCardIfGenerationCurrent({
      cardId,
      dbClient,
      fields: {
        generationRequestedAt: null,
        isGenerating: false,
        lastGeneratedAt: new Date().toISOString(),
        output: result.output,
        sourceFingerprint: analysisContext.sourceFingerprint,
      },
      requestedAt,
    });

    const title = card.title ?? cardTitle.fallbackCardTitle(card.prompt);

    return {
      output: result.output,
      stale: !didWrite,
      success: didWrite,
      title,
    };
  } catch (error) {
    console.error('Card refresh failed', { cardId, error });

    if (isFinalAttempt) {
      await markCardGenerationFailed({ cardId, dbClient, requestedAt });
      return { error: CARD_GENERATION_ERROR_MESSAGE, success: false };
    }

    return {
      error: CARD_GENERATION_ERROR_MESSAGE,
      retryAfterSeconds: CARD_GENERATION_FAILURE_RETRY_DELAY_SECONDS,
      success: false,
    };
  }
};

export const tweakCard = async ({
  cardId,
  dbClient,
  env,
  isFinalAttempt,
  requestedAt,
  tweakPrompt,
}: {
  cardId: string;
  dbClient: Db;
  env: CloudflareEnv;
  isFinalAttempt?: boolean;
  requestedAt: string;
  tweakPrompt: string;
}) => {
  const card = await getCardOrThrow({ cardId, dbClient });

  if (
    !isSameGenerationRequest({
      generationRequestedAt: card.generationRequestedAt,
      requestedAt,
    })
  ) {
    return { stale: true, success: false };
  }

  if (!card.logId || !card.prompt) {
    await markCardGenerationFailed({ cardId, dbClient, requestedAt });
    return { error: CARD_GENERATION_ERROR_MESSAGE, success: false };
  }

  const previousOutput = readCardOutput(card.output);

  if (!previousOutput) {
    await markCardGenerationFailed({ cardId, dbClient, requestedAt });
    return { error: CARD_GENERATION_ERROR_MESSAGE, success: false };
  }

  try {
    const tagIds = card.tags?.map((tag) => tag.id) ?? [];

    const analysisContext = await getCardAnalysisContext({
      dbClient,
      env,
      generationTime: requestedAt,
      logId: card.logId,
      prompt: card.prompt,
      tagIds,
    });

    if (!analysisContext.sourceSelection.records.length) {
      return writeNoSourceRecordGenerationResult({
        cardId,
        dbClient,
        previousOutput: card.output,
        prompt: card.prompt,
        requestedAt,
        sourceFingerprint: analysisContext.sourceFingerprint,
      });
    }

    if (analysisContext.plan.mode === 'exact') {
      return startExactAnalysis({
        analysisContext,
        cardId,
        dbClient,
        env,
        jobType: 'tweak',
        requestedAt,
        tweakPrompt,
      });
    }

    const result = await tweakCardResult({
      analysisContext,
      dbClient,
      env,
      generationTime: requestedAt,
      logId: card.logId,
      previousOutput,
      previousTitle: card.title,
      prompt: card.prompt,
      tagIds,
      tweakPrompt,
    });

    if (!result) {
      return writeNoSourceRecordGenerationResult({
        cardId,
        dbClient,
        previousOutput: card.output,
        prompt: card.prompt,
        requestedAt,
        sourceFingerprint: analysisContext.sourceFingerprint,
      });
    }

    const didWrite = await updateCardIfGenerationCurrent({
      cardId,
      dbClient,
      fields: {
        generationRequestedAt: null,
        isGenerating: false,
        lastGeneratedAt: new Date().toISOString(),
        output: result.output,
        sourceFingerprint: analysisContext.sourceFingerprint,
        title: result.title,
      },
      requestedAt,
    });

    return {
      output: result.output,
      prompt: card.prompt,
      stale: !didWrite,
      success: didWrite,
      title: result.title,
    };
  } catch (error) {
    console.error('Card tweak failed', { cardId, error });

    if (isFinalAttempt) {
      await markCardGenerationFailed({ cardId, dbClient, requestedAt });
      return { error: CARD_GENERATION_ERROR_MESSAGE, success: false };
    }

    return {
      error: CARD_GENERATION_ERROR_MESSAGE,
      retryAfterSeconds: CARD_GENERATION_FAILURE_RETRY_DELAY_SECONDS,
      success: false,
    };
  }
};

const enqueueCardGenerateJob = async ({
  cardId,
  env,
  requestedAt,
}: {
  cardId: string;
  env: CloudflareEnv;
  requestedAt: string;
}) => {
  await enqueueJob(env, {
    cardId,
    requestedAt,
    schemaVersion: 1,
    type: 'card.generate',
  });
};

const enqueueCardRefreshJob = async ({
  cardId,
  delaySeconds,
  env,
  requestedAt,
}: {
  cardId: string;
  delaySeconds?: number;
  env: CloudflareEnv;
  requestedAt: string;
}) => {
  await enqueueJob(
    env,
    { cardId, requestedAt, schemaVersion: 1, type: 'card.refresh' },
    delaySeconds == null ? undefined : { delaySeconds }
  );
};

const enqueueCardTweakJob = async ({
  cardId,
  env,
  requestedAt,
  tweakPrompt,
}: {
  cardId: string;
  env: CloudflareEnv;
  requestedAt: string;
  tweakPrompt: string;
}) => {
  await enqueueJob(env, {
    cardId,
    requestedAt,
    schemaVersion: 1,
    tweakPrompt,
    type: 'card.tweak',
  });
};

const enqueueAnalysisExtractJob = async ({
  analysisId,
  cardId,
  chunkIndex,
  env,
  requestedAt,
}: {
  analysisId: string;
  cardId: string;
  chunkIndex: number;
  env: CloudflareEnv;
  requestedAt: string;
}) => {
  await enqueueJob(env, {
    analysisId,
    cardId,
    chunkIndex,
    requestedAt,
    schemaVersion: 1,
    type: 'analysis.extract',
  });
};

const enqueueAnalysisFinalizeJob = async ({
  analysisId,
  cardId,
  env,
  requestedAt,
}: {
  analysisId: string;
  cardId: string;
  env: CloudflareEnv;
  requestedAt: string;
}) => {
  await enqueueJob(env, {
    analysisId,
    cardId,
    requestedAt,
    schemaVersion: 1,
    type: 'analysis.finalize',
  });
};

const readAnalysisJobType = (value: unknown): AnalysisJobType | undefined =>
  value === 'generate' || value === 'refresh' || value === 'tweak'
    ? value
    : undefined;

const getFactIdentity = ({
  analysisSpecHash,
  cardId,
  record,
  tagIds,
}: {
  analysisSpecHash: string;
  cardId: string;
  record: PublishedCardSourceRecord;
  tagIds: string[];
}) => {
  const recordFingerprint = cardAnalysis.recordFingerprint({
    record,
    selectedTagIds: tagIds,
  });

  return {
    key: cardAnalysis.factKey({
      analysisSpecHash,
      cardId,
      recordFingerprint,
      recordId: record.id,
    }),
    record,
  };
};

const getCachedFactsForRecords = async ({
  dbClient,
  analysisSpecHash,
  cardId,
  records,
  tagIds,
}: {
  dbClient: Db;
  analysisSpecHash: string;
  cardId: string;
  records: PublishedCardSourceRecord[];
  tagIds: string[];
}) => {
  const expectedByKey = new Map(
    records.map((record) => {
      const identity = getFactIdentity({
        analysisSpecHash,
        cardId,
        record,
        tagIds,
      });

      return [identity.key, identity.record] as const;
    })
  );

  const keys = [...expectedByKey.keys()];

  const result = keys.length
    ? await dbClient.query({
        facts: {
          $: { fields: ['data', 'key'], where: { key: { $in: keys } } },
        },
      })
    : { facts: [] };

  const validFacts: cardAnalysis.CardFactRecord[] = [];
  const validRecordIds = new Set<string>();

  for (const fact of (result.facts ?? []) as FactEntity[]) {
    const record = expectedByKey.get(fact.key);
    if (!record) continue;
    validFacts.push({ facts: fact.data });
    validRecordIds.add(record.id);
  }

  return {
    missingRecords: records.filter((record) => !validRecordIds.has(record.id)),
    validFacts,
    validRecordIds,
  };
};

const upsertRecordFacts = async ({
  cardId,
  dbClient,
  analysisSpecHash,
  extractedFacts,
  records,
  tagIds,
}: {
  cardId: string;
  dbClient: Db;
  analysisSpecHash: string;
  extractedFacts: cardAnalysis.ExtractedRecordFacts[];
  records: PublishedCardSourceRecord[];
  tagIds: string[];
}) => {
  const recordsById = new Map(records.map((record) => [record.id, record]));

  const transactions = extractedFacts.flatMap((facts) => {
    const record = recordsById.get(facts.recordId);
    if (!record) return [];

    const { key } = getFactIdentity({
      analysisSpecHash,
      cardId,
      record,
      tagIds,
    });

    return dbClient.tx.facts[lookup('key', key)]
      .update({ data: facts })
      .link({ card: cardId, record: record.id });
  });

  if (transactions.length) await dbClient.transact(transactions);
};

const recomputeAnalysisProgress = async ({
  chunks,
  dbClient,
  analysisSpecHash,
  cardId,
  records,
  tagIds,
}: {
  chunks: string[][];
  dbClient: Db;
  analysisSpecHash: string;
  cardId: string;
  records: PublishedCardSourceRecord[];
  tagIds: string[];
}) => {
  const { validFacts, validRecordIds } = await getCachedFactsForRecords({
    dbClient,
    analysisSpecHash,
    cardId,
    records,
    tagIds,
  });

  const completedChunkIndexes = chunks
    .map((recordIds, index) =>
      recordIds.every((recordId) => validRecordIds.has(recordId))
        ? index
        : undefined
    )
    .filter((index): index is number => index != null);

  const complete = completedChunkIndexes.length === chunks.length;
  return { complete, completedChunkIndexes, validFacts };
};

const cleanupCompletedExactAnalysis = async ({
  analysisId,
  analysisSpecHash,
  cardId,
  dbClient,
  records,
  tagIds,
}: {
  analysisId: string;
  analysisSpecHash: string;
  cardId: string;
  dbClient: Db;
  records: PublishedCardSourceRecord[];
  tagIds: string[];
}) => {
  try {
    const expectedFactKeys = new Set(
      records.map(
        (record) =>
          getFactIdentity({ analysisSpecHash, cardId, record, tagIds }).key
      )
    );

    const { cards } = await dbClient.query({
      cards: {
        $: { fields: ['id'], where: { id: cardId } },
        analyses: { $: { fields: ['id'] } },
        facts: { $: { fields: ['id', 'key'] } },
      },
    });

    const card = cards[0] as AnalysisCleanupCard | undefined;
    if (!card?.id) return;

    const transactions = [
      ...(card.analyses ?? [])
        .filter((analysis) => analysis.id !== analysisId)
        .map((analysis) => dbClient.tx.analyses[analysis.id].delete()),
      ...(card.facts ?? [])
        .filter((fact) => !expectedFactKeys.has(fact.key))
        .map((fact) => dbClient.tx.facts[fact.id].delete()),
    ];

    if (transactions.length) await dbClient.transact(transactions);
  } catch (error) {
    console.error('Card analysis cleanup failed', {
      analysisId,
      cardId,
      error,
    });
  }
};

const startExactAnalysis = async ({
  analysisContext,
  cardId,
  dbClient,
  env,
  jobType,
  requestedAt,
  tweakPrompt,
}: {
  analysisContext: CardAnalysisContext;
  cardId: string;
  dbClient: Db;
  env: CloudflareEnv;
  jobType: AnalysisJobType;
  requestedAt: string;
  tweakPrompt?: string;
}) => {
  const analysisSpec = withAnalysisSpec(analysisContext.plan);
  const analysisId = generateId();

  const chunks = cardAnalysis.chunkRecordIds({
    recordIds: analysisContext.sourceRecords.map((record) => record.id),
  });

  await dbClient.transact(
    dbClient.tx.analyses[analysisId]
      .update({ analysisSpec, jobType, ...(tweakPrompt && { tweakPrompt }) })
      .link({ card: cardId })
  );

  try {
    await Promise.all(
      chunks.map((_chunk, chunkIndex) =>
        enqueueAnalysisExtractJob({
          analysisId,
          cardId,
          chunkIndex,
          env,
          requestedAt,
        })
      )
    );
  } catch (error) {
    await markCardGenerationFailed({ cardId, dbClient, requestedAt });
    throw error;
  }

  return {
    analysisId,
    analysisMode: 'exact' as const,
    queued: true,
    success: true,
  };
};

const getAnalysisJobContext = async ({
  analysisId,
  cardId,
  dbClient,
  requestedAt,
}: {
  analysisId: string;
  cardId: string;
  dbClient: Db;
  requestedAt: string;
}) => {
  const [{ analyses }, { cards }] = await Promise.all([
    dbClient.query({ analyses: { $: { where: { id: analysisId } } } }),
    dbClient.query({
      cards: {
        $: { where: { id: cardId } },
        tags: { $: { fields: ['id', 'name'] } },
      },
    }),
  ]);

  const analysis = analyses[0] as AnalysisEntity | undefined;
  const card = cards[0] as CardEntity | undefined;
  if (!analysis?.id || !card?.id) return { stale: true as const };

  if (
    !isSameGenerationRequest({
      generationRequestedAt: card.generationRequestedAt,
      requestedAt,
    })
  ) {
    return { analysis, card, stale: true as const };
  }

  if (!card.logId || !card.prompt) {
    await markCardGenerationFailed({ cardId, dbClient, requestedAt });
    return { analysis, card, failed: true as const };
  }

  const analysisSpec = cardAnalysis.normalizeAnalysisSpec(
    analysis.analysisSpec
  );

  const jobType = readAnalysisJobType(analysis.jobType);

  if (!analysisSpec || !jobType) {
    await markCardGenerationFailed({ cardId, dbClient, requestedAt });
    return { analysis, card, failed: true as const };
  }

  const tagIds = card.tags?.map((tag) => tag.id) ?? [];
  const analysisSpecHash = cardAnalysis.analysisSpecHash(analysisSpec);

  const analysisContext = await getCardAnalysisContext({
    analysisPlan: { analysisSpec, analysisSpecHash, mode: 'exact' },
    dbClient,
    generationTime: requestedAt,
    logId: card.logId,
    prompt: card.prompt,
    tagIds,
  });

  const chunks = cardAnalysis.chunkRecordIds({
    recordIds: analysisContext.sourceRecords.map((record) => record.id),
  });

  return {
    analysis,
    analysisContext,
    card,
    chunks,
    analysisSpec,
    analysisSpecHash,
    jobType,
    stale: false as const,
    tagIds,
  };
};

export const extractCardAnalysisChunk = async ({
  analysisId,
  cardId,
  chunkIndex,
  dbClient,
  env,
  isFinalAttempt,
  requestedAt,
}: {
  analysisId: string;
  cardId: string;
  chunkIndex: number;
  dbClient: Db;
  env: CloudflareEnv;
  isFinalAttempt?: boolean;
  requestedAt: string;
}) => {
  try {
    const context = await getAnalysisJobContext({
      analysisId,
      cardId,
      dbClient,
      requestedAt,
    });

    if ('stale' in context && context.stale) {
      return { stale: true, success: false };
    }

    if ('failed' in context) return { success: false };
    const chunkRecordIds = context.chunks[chunkIndex] ?? [];
    if (!chunkRecordIds.length) return { stale: false, success: true };
    const chunkRecordIdSet = new Set(chunkRecordIds);

    const chunkRecords = context.analysisContext.sourceRecords.filter(
      (record) => chunkRecordIdSet.has(record.id)
    );

    const { missingRecords } = await getCachedFactsForRecords({
      dbClient,
      analysisSpecHash: context.analysisSpecHash,
      cardId,
      records: chunkRecords,
      tagIds: context.tagIds,
    });

    if (missingRecords.length) {
      const extractedFacts = await openrouter.extractRecordFacts({
        env,
        analysisSpec: context.analysisSpec,
        records: missingRecords,
      });

      await upsertRecordFacts({
        cardId,
        dbClient,
        extractedFacts,
        analysisSpecHash: context.analysisSpecHash,
        records: missingRecords,
        tagIds: context.tagIds,
      });
    }

    const progress = await recomputeAnalysisProgress({
      chunks: context.chunks,
      dbClient,
      analysisSpecHash: context.analysisSpecHash,
      cardId,
      records: context.analysisContext.sourceRecords,
      tagIds: context.tagIds,
    });

    if (progress.complete) {
      await enqueueAnalysisFinalizeJob({
        analysisId,
        cardId,
        env,
        requestedAt,
      });
    }

    return {
      completedChunkCount: progress.completedChunkIndexes.length,
      success: true,
    };
  } catch (error) {
    console.error('Card analysis extraction failed', {
      analysisId,
      cardId,
      chunkIndex,
      error,
    });

    if (isFinalAttempt) {
      await markCardGenerationFailed({ cardId, dbClient, requestedAt });
      return { error: CARD_GENERATION_ERROR_MESSAGE, success: false };
    }

    return {
      error: CARD_GENERATION_ERROR_MESSAGE,
      retryAfterSeconds: CARD_GENERATION_FAILURE_RETRY_DELAY_SECONDS,
      success: false,
    };
  }
};

export const finalizeCardAnalysis = async ({
  analysisId,
  cardId,
  dbClient,
  env,
  isFinalAttempt,
  requestedAt,
}: {
  analysisId: string;
  cardId: string;
  dbClient: Db;
  env: CloudflareEnv;
  isFinalAttempt?: boolean;
  requestedAt: string;
}) => {
  try {
    const context = await getAnalysisJobContext({
      analysisId,
      cardId,
      dbClient,
      requestedAt,
    });

    if ('stale' in context && context.stale) {
      return { stale: true, success: false };
    }

    if ('failed' in context) return { success: false };

    const progress = await recomputeAnalysisProgress({
      chunks: context.chunks,
      dbClient,
      analysisSpecHash: context.analysisSpecHash,
      cardId,
      records: context.analysisContext.sourceRecords,
      tagIds: context.tagIds,
    });

    if (!progress.complete) {
      const completed = new Set(progress.completedChunkIndexes);

      const missingChunkIndexes = context.chunks
        .map((_chunk, index) => index)
        .filter((index) => !completed.has(index));

      await Promise.all(
        missingChunkIndexes.map((chunkIndex) =>
          enqueueAnalysisExtractJob({
            analysisId,
            cardId,
            chunkIndex,
            env,
            requestedAt,
          })
        )
      );

      return { waiting: true, success: true };
    }

    const exactFacts = cardAnalysis.aggregateExtractedFacts({
      analysisSpec: context.analysisSpec,
      facts: progress.validFacts,
      generationTime: requestedAt,
      records: context.analysisContext.sourceRecords,
      tagIds: context.tagIds,
    });

    const analysisContext: CardAnalysisContext = {
      ...context.analysisContext,
      exactFacts,
      plan: {
        analysisSpec: context.analysisSpec,
        analysisSpecHash: context.analysisSpecHash,
        mode: 'exact',
      },
    };

    const previousOutput = readCardOutput(context.card.output);
    const blueprint = cardBlueprint.readCardBlueprint(context.card.blueprint);
    const currentTitle = context.card.title?.trim() || undefined;

    let result:
      | Awaited<ReturnType<typeof generateCardResult>>
      | Awaited<ReturnType<typeof refreshCardResult>>
      | Awaited<ReturnType<typeof tweakCardResult>>
      | null;

    if (context.jobType === 'refresh' && previousOutput) {
      result = await refreshCardResult({
        analysisContext,
        dbClient,
        env,
        generationTime: requestedAt,
        logId: context.card.logId!,
        previousOutput,
        previousTitle: context.card.title,
        prompt: context.card.prompt!,
        tagIds: context.tagIds,
      });
    } else if (
      context.jobType === 'tweak' &&
      previousOutput &&
      context.analysis.tweakPrompt
    ) {
      result = await tweakCardResult({
        analysisContext,
        dbClient,
        env,
        generationTime: requestedAt,
        logId: context.card.logId!,
        previousOutput,
        previousTitle: context.card.title,
        prompt: context.card.prompt!,
        tagIds: context.tagIds,
        tweakPrompt: context.analysis.tweakPrompt,
      });
    } else {
      result = await generateCardResult({
        analysisContext,
        blueprint,
        cardId: context.card.id,
        dbClient,
        env,
        generationTime: requestedAt,
        logId: context.card.logId!,
        prompt: context.card.prompt!,
        tagIds: context.tagIds,
      });
    }

    if (!result) {
      return writeNoSourceRecordGenerationResult({
        cardId,
        dbClient,
        previousOutput: context.card.output,
        prompt: context.card.prompt!,
        requestedAt,
        sourceFingerprint: analysisContext.sourceFingerprint,
        ...(blueprint && currentTitle && { title: currentTitle }),
      });
    }

    const isRefresh = context.jobType === 'refresh' && previousOutput;

    const keepBlueprintTitle =
      context.jobType !== 'tweak' && blueprint && currentTitle;

    const title = keepBlueprintTitle
      ? currentTitle
      : 'title' in result && result.title
        ? result.title
        : (context.card.title ??
          cardTitle.fallbackCardTitle(context.card.prompt!));

    const didWrite = await updateCardIfGenerationCurrent({
      cardId,
      dbClient,
      fields: {
        generationRequestedAt: null,
        isGenerating: false,
        lastGeneratedAt: new Date().toISOString(),
        ...(!isRefresh && { blueprint: null, title }),
        output: result.output,
        sourceFingerprint: analysisContext.sourceFingerprint,
      },
      requestedAt,
    });

    if (didWrite) {
      await cleanupCompletedExactAnalysis({
        analysisId,
        analysisSpecHash: context.analysisSpecHash,
        cardId,
        dbClient,
        records: context.analysisContext.sourceRecords,
        tagIds: context.tagIds,
      });
    }

    return {
      output: result.output,
      stale: !didWrite,
      success: didWrite,
      title,
    };
  } catch (error) {
    console.error('Card analysis finalization failed', {
      analysisId,
      cardId,
      error,
    });

    if (isFinalAttempt) {
      await markCardGenerationFailed({ cardId, dbClient, requestedAt });
      return { error: CARD_GENERATION_ERROR_MESSAGE, success: false };
    }

    return {
      error: CARD_GENERATION_ERROR_MESSAGE,
      retryAfterSeconds: CARD_GENERATION_FAILURE_RETRY_DELAY_SECONDS,
      success: false,
    };
  }
};

export const createCard = async ({
  dbClient,
  env,
  input,
  userId,
}: {
  dbClient: Db;
  env: CloudflareEnv;
  input: CardCreateInput;
  userId: string;
}) => {
  const normalized = normalizeCardWriteInput(input);

  const access = await getManageableLogAccess({
    dbClient,
    logId: input.logId,
    userId,
  });

  const tagIds = await validateCardTags({
    dbClient,
    logId: access.logId,
    tagIds: normalized.tagIds,
    teamId: access.teamId,
  });

  const cardId = generateId();
  const requestedAt = new Date().toISOString();

  await dbClient.transact([
    dbClient.tx.cards[cardId]
      .update({
        generationRequestedAt: requestedAt,
        isGenerating: true,
        logId: access.logId,
        order: await getNextCardOrder({ dbClient, logId: access.logId }),
        prompt: normalized.prompt,
        teamId: access.teamId,
        title: cardTitle.fallbackCardTitle(normalized.prompt),
        type: constants.CARD_TYPE_PROGRESS,
      })
      .link({ log: access.logId, team: access.teamId }),
    ...tagIds.map((tagId) => dbClient.tx.cards[cardId].link({ tags: tagId })),
  ]);

  try {
    await enqueueCardGenerateJob({ cardId, env, requestedAt });
  } catch (error) {
    await markCardGenerationFailed({ cardId, dbClient, requestedAt });
    throw error;
  }

  return { id: cardId, queued: true, success: true };
};

export const updateCard = async ({
  cardId,
  dbClient,
  env,
  input,
  userId,
}: {
  cardId: string;
  dbClient: Db;
  env: CloudflareEnv;
  input: CardWriteInput;
  userId: string;
}) => {
  const normalized = normalizeCardWriteInput(input);
  const card = await getManageableCard({ cardId, dbClient, userId });

  if (!card.logId || !card.teamId) {
    throw new HTTPException(400, { message: 'Invalid card' });
  }

  const tagIds = await validateCardTags({
    dbClient,
    logId: card.logId,
    tagIds: normalized.tagIds,
    teamId: card.teamId,
  });

  const nextTagIds = new Set(tagIds);
  const previousTagIds = new Set(card.tags?.map((tag) => tag.id) ?? []);
  const unlinkTagIds = [...previousTagIds].filter((id) => !nextTagIds.has(id));
  const linkTagIds = [...nextTagIds].filter((id) => !previousTagIds.has(id));
  const requestedAt = new Date().toISOString();

  await dbClient.transact([
    dbClient.tx.cards[cardId].update({
      blueprint: null,
      generationRequestedAt: requestedAt,
      isGenerating: true,
      prompt: normalized.prompt,
      sourceFingerprint: null,
    }),
    ...unlinkTagIds.map((tagId) =>
      dbClient.tx.cards[cardId].unlink({ tags: tagId })
    ),
    ...linkTagIds.map((tagId) =>
      dbClient.tx.cards[cardId].link({ tags: tagId })
    ),
  ]);

  try {
    await enqueueCardGenerateJob({ cardId, env, requestedAt });
  } catch (error) {
    await markCardGenerationFailed({ cardId, dbClient, requestedAt });
    throw error;
  }

  return { id: cardId, queued: true, success: true };
};

export const deleteCardForUser = async ({
  cardId,
  dbClient,
  userId,
}: {
  cardId: string;
  dbClient: Db;
  userId: string;
}) => {
  await getManageableCard({ cardId, dbClient, userId });
  await dbClient.transact(dbClient.tx.cards[cardId].delete());
  return { success: true };
};

export const refreshCardForUser = async ({
  cardId,
  dbClient,
  env,
  userId,
}: {
  cardId: string;
  dbClient: Db;
  env: CloudflareEnv;
  userId: string;
}) => {
  const card = await getManageableCard({ cardId, dbClient, userId });
  const requestedAt = new Date().toISOString();

  if (card.logId && card.prompt && readCardOutput(card.output)) {
    const tagIds = card.tags?.map((tag) => tag.id) ?? [];

    const { sourceFingerprint } = await getCardSourceFingerprintContext({
      dbClient,
      generationTime: requestedAt,
      logId: card.logId,
      prompt: card.prompt,
      tagIds,
    });

    if (cardSourceFingerprintMatches({ card, sourceFingerprint })) {
      return { queued: false, skipped: true, success: true };
    }
  }

  await dbClient.transact(
    dbClient.tx.cards[cardId].update({
      error: '',
      generationRequestedAt: requestedAt,
      isGenerating: true,
    })
  );

  try {
    await enqueueCardRefreshJob({ cardId, env, requestedAt });
  } catch (error) {
    await markCardGenerationFailed({ cardId, dbClient, requestedAt });
    throw error;
  }

  return { queued: true, success: true };
};

export const tweakCardForUser = async ({
  cardId,
  dbClient,
  env,
  input,
  userId,
}: {
  cardId: string;
  dbClient: Db;
  env: CloudflareEnv;
  input: CardTweakInput;
  userId: string;
}) => {
  const card = await getManageableCard({ cardId, dbClient, userId });

  if (!readCardOutput(card.output)) {
    throw new HTTPException(400, { message: CARD_GENERATION_ERROR_MESSAGE });
  }

  const tweakPrompt = trimRequired(
    input.prompt,
    CARD_TWEAK_PROMPT_MAX_LENGTH,
    'Invalid tweak prompt'
  );

  const requestedAt = new Date().toISOString();

  await dbClient.transact(
    dbClient.tx.cards[cardId].update({
      generationRequestedAt: requestedAt,
      isGenerating: true,
    })
  );

  try {
    await enqueueCardTweakJob({ cardId, env, requestedAt, tweakPrompt });
  } catch (error) {
    await markCardGenerationFailed({ cardId, dbClient, requestedAt });
    throw error;
  }

  return { queued: true, success: true };
};

const cardMatchesRecordTags = (
  card: Pick<CardEntity, 'tags'>,
  recordTagIds: ReadonlySet<string>
) => cardSourceSelection.recordMatchesCardTags(card, recordTagIds);

export const refreshPublishedRecordCards = async ({
  debounceMs = CARD_REFRESH_DEBOUNCE_MS,
  dbClient,
  env,
  logId,
  recordTagIds,
}: {
  debounceMs?: number;
  dbClient: Db;
  env: CloudflareEnv;
  logId: string;
  recordTagIds: string[];
}) => {
  const selectedRecordTagIds =
    cardSourceSelection.uniqueCardTagIds(recordTagIds);

  if (!selectedRecordTagIds.length) return;
  const selectedRecordTagIdSet = new Set(selectedRecordTagIds);

  const { cards } = await dbClient.query({
    cards: {
      $: {
        fields: ['id'],
        where: { logId, type: constants.CARD_TYPE_PROGRESS },
      },
      tags: { $: { fields: ['id'] } },
    },
  });

  const matchingCards = (cards as CardEntity[]).filter((card) =>
    cardMatchesRecordTags(card, selectedRecordTagIdSet)
  );

  if (!matchingCards.length) return;
  const requestedAt = new Date().toISOString();
  const delaySeconds = Math.ceil(debounceMs / 1000);

  const markMatchingCardsGenerating = matchingCards.map((card) =>
    dbClient.tx.cards[card.id].update({
      error: '',
      generationRequestedAt: requestedAt,
      isGenerating: true,
    })
  );

  await dbClient.transact(markMatchingCardsGenerating);

  try {
    await Promise.all(
      matchingCards.map((card) =>
        enqueueCardRefreshJob({
          cardId: card.id,
          delaySeconds,
          env,
          requestedAt,
        })
      )
    );
  } catch (error) {
    await Promise.all(
      matchingCards.map((card) =>
        updateCardIfGenerationCurrent({
          cardId: card.id,
          dbClient,
          fields: { generationRequestedAt: null, isGenerating: false },
          requestedAt,
        })
      )
    );

    throw error;
  }
};

export const queuePublishedRecordCardRefreshes = async (params: {
  dbClient: Db;
  env: CloudflareEnv;
  logId: string;
  recordTagIds: string[];
}) => {
  try {
    await refreshPublishedRecordCards({
      debounceMs: CARD_REFRESH_DEBOUNCE_MS,
      ...params,
    });
  } catch (error) {
    console.error('Card refresh enqueue failed after content change', error);
  }
};

const fileCardRefreshRecord = (file: FileCardRefreshSource) => {
  if (file.record?.id) {
    return recordStatus.recordIsPublished(file.record)
      ? file.record
      : undefined;
  }

  const record = file.reply?.record;

  if (
    !file.reply?.id ||
    file.reply.isDraft ||
    !record?.id ||
    !recordStatus.recordIsPublished(record)
  ) {
    return;
  }

  return record;
};

export const queuePublishedFileCardRefreshes = async ({
  dbClient,
  env,
  fileId,
}: {
  dbClient: Db;
  env: CloudflareEnv;
  fileId: string;
}) => {
  try {
    const { files } = await dbClient.query({
      files: {
        $: { fields: ['id' as const], where: { id: fileId } },
        record: {
          $: { fields: ['id' as const, 'logId' as const, 'status' as const] },
          log: { $: { fields: ['id' as const] } },
          tags: { $: { fields: ['id' as const] } },
        },
        reply: {
          $: { fields: ['id' as const, 'isDraft' as const] },
          record: {
            $: { fields: ['id' as const, 'logId' as const, 'status' as const] },
            log: { $: { fields: ['id' as const] } },
            tags: { $: { fields: ['id' as const] } },
          },
        },
      },
    });

    const file = files[0] as FileCardRefreshSource | undefined;
    if (!file?.id) return;
    const record = fileCardRefreshRecord(file);
    const logId = record?.logId ?? record?.log?.id;
    const recordTagIds = record?.tags?.map((tag) => tag.id) ?? [];
    if (!logId || !recordTagIds.length) return;

    await queuePublishedRecordCardRefreshes({
      dbClient,
      env,
      logId,
      recordTagIds,
    });
  } catch (error) {
    console.error(
      'Card refresh enqueue failed after file transcript change',
      error
    );
  }
};

const validateRecordRefreshTags = async ({
  dbClient,
  logId,
  tagIds,
  teamId,
}: {
  dbClient: Db;
  logId: string;
  tagIds: string[];
  teamId: string;
}) => {
  if (!tagIds.length) return [];

  const { tags } = await dbClient.query({
    tags: {
      $: { fields: ['id', 'teamId', 'type'], where: { id: { $in: tagIds } } },
      logs: { $: { fields: ['id'] } },
    },
  });

  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

  for (const tagId of tagIds) {
    const tag = tagsById.get(tagId);

    if (
      !tag ||
      tag.type !== 'record' ||
      tag.teamId !== teamId ||
      !tag.logs?.some((log) => log.id === logId)
    ) {
      throw new HTTPException(400, { message: 'Invalid source tags' });
    }
  }

  return tagIds;
};

export const refreshRecordCardsForUser = async ({
  dbClient,
  env,
  input,
  userId,
}: {
  dbClient: Db;
  env: CloudflareEnv;
  input: CardRecordRefreshInput;
  userId: string;
}) => {
  const { records } = await dbClient.query({
    records: {
      $: {
        fields: ['id', 'logId', 'status', 'teamId'],
        where: { id: input.recordId },
      },
      author: { user: { $: { fields: ['id'] } } },
      log: {
        team: {
          roles: { $: { fields: ['role', 'userId'], where: { userId } } },
        },
      },
      tags: { $: { fields: ['id'] } },
    },
  });

  const record = records[0];

  if (!record?.id) {
    throw new HTTPException(404, { message: 'Record not found' });
  }

  if (!recordStatus.recordIsPublished(record)) return { success: true };

  if (!record.logId) {
    throw new HTTPException(400, { message: 'Invalid record' });
  }

  if (!record.teamId) {
    throw new HTTPException(400, { message: 'Invalid record' });
  }

  const actorRole = record.log?.team?.roles?.[0]?.role;
  const isAuthor = record.author?.user?.id === userId;

  if (!canRefreshRecordCards({ actorRole, isAuthor })) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  const recordTagIds = cardSourceSelection.uniqueCardTagIds(
    input.tagIds?.length
      ? input.tagIds
      : (record.tags?.map((tag) => tag.id) ?? [])
  );

  if (!recordTagIds.length) return { success: true };

  const tagIds = await validateRecordRefreshTags({
    dbClient,
    logId: record.logId,
    tagIds: recordTagIds,
    teamId: record.teamId,
  });

  await refreshPublishedRecordCards({
    dbClient,
    debounceMs: CARD_REFRESH_DEBOUNCE_MS,
    env,
    logId: record.logId,
    recordTagIds: tagIds,
  });

  return { success: true };
};

export const ensureValidCardOutput = (output: unknown) => {
  const parsed = cardOutput.validateCardOutput(output);
  if (!parsed.success) throw new Error('Invalid card output');
  return parsed.data;
};
