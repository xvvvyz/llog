import type { Db } from '@/api/middleware/db';
import * as openai from '@/api/cards/openai';
import { enqueueJob } from '@/api/jobs/payload';
import * as constants from '@/domain/cards/constants';
import * as cardOutput from '@/domain/cards/output';
import * as cardSourceSelection from '@/domain/cards/source-selection';
import { publishedContentWhere } from '@/domain/records/query';
import * as permissions from '@/domain/teams/permissions';
import { id as generateId } from '@instantdb/admin';
import { HTTPException } from 'hono/http-exception';

export const CARD_TITLE_MAX_LENGTH = 80;

export const CARD_TWEAK_PROMPT_MAX_LENGTH = 1000;

export const MAX_CARD_TAGS = 20;

export const MAX_CARD_REORDER_IDS = 100;

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

export type CardReorderInput = { logId: string; orderedIds: string[] };

export type CardRecordRefreshInput = { recordId: string; tagIds: string[] };

type LogAccess = {
  actorRole?: string | null;
  isLogMember: boolean;
  logId: string;
  teamId: string;
};

type CardEntity = {
  generationRequestedAt?: Date | number | string | null;
  id: string;
  isGenerating?: boolean | null;
  logId?: string | null;
  order?: number | null;
  output?: unknown;
  prompt?: string | null;
  tags?: { id: string; name?: string | null }[];
  teamId?: string | null;
  title?: string | null;
};

type CardRefreshDebounceEntity = {
  id: string;
  logId?: string | null;
  requestedAt?: Date | number | string | null;
  runAfter?: Date | number | string | null;
  status?: string | null;
  tagIds?: unknown;
  teamId?: string | null;
  token?: string | null;
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

const CARD_GENERATION_ERROR_MESSAGE = 'Failed to generate card.';

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

const addMilliseconds = (date: Date, milliseconds: number) =>
  new Date(date.getTime() + milliseconds).toISOString();

const readTagIds = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && !!item)
    : [];

export const mergeCardRefreshTagIds = (
  currentTagIds: unknown,
  nextTagIds: string[]
) =>
  cardSourceSelection.uniqueCardTagIds([
    ...readTagIds(currentTagIds),
    ...nextTagIds,
  ]);

export const isQueuedRefreshDebounceCurrent = ({
  debounceMs,
  now,
  runAfter,
  status,
}: {
  debounceMs: number;
  now: Date;
  runAfter?: Date | number | string | null;
  status?: string | null;
}) => {
  const runAfterTime = timeValue(runAfter);
  if (status !== 'queued' || runAfterTime == null) return false;
  const nowTime = now.getTime();
  return runAfterTime > nowTime && runAfterTime <= nowTime + debounceMs;
};

const fallbackCardTitle = (prompt: string) => {
  const firstLine = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return (firstLine || 'Progress card').slice(0, CARD_TITLE_MAX_LENGTH);
};

const readCardOutput = (value: unknown) => {
  const parsed = cardOutput.validateCardOutput(value);
  return parsed.success ? parsed.data : undefined;
};

const applyOrderedCardIds = <T extends { id: string }>(
  cards: T[],
  orderedIds: string[]
) => {
  if (cards.length < 2 || orderedIds.length < 2) return cards;
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const orderedCards: T[] = [];
  const seenIds = new Set<string>();

  for (const id of orderedIds) {
    if (seenIds.has(id)) continue;
    const card = cardById.get(id);
    if (!card) continue;
    orderedCards.push(card);
    seenIds.add(id);
  }

  if (orderedCards.length < 2) return cards;
  let orderedIndex = 0;

  return cards.map((card) =>
    seenIds.has(card.id) ? orderedCards[orderedIndex++] : card
  );
};

const getTaggedSourceRecordSelection = async ({
  dbClient,
  limit,
  logId,
  tagIds,
}: {
  dbClient: Db;
  limit?: number;
  logId: string;
  tagIds: string[];
}) => {
  if (!tagIds.length) return { records: [], totalMatchingRecords: 0 };

  const { records } = await dbClient.query({
    records: {
      $: {
        fields: ['date', 'id', 'text'],
        order: { date: 'asc' },
        where: {
          ...publishedContentWhere,
          'tags.id': { $in: tagIds },
          logId,
          text: { $not: '' },
        },
      },
      tags: { $: { fields: ['id', 'name'] } },
    },
  });

  return cardSourceSelection.selectCardSourceRecordCoverage({
    limit,
    records,
    tagIds,
  });
};

const getTaggedSourceRecords = async (
  params: Parameters<typeof getTaggedSourceRecordSelection>[0]
) => (await getTaggedSourceRecordSelection(params)).records;

const noSourceRecordGenerationFields = ({
  previousOutput,
  prompt,
}: {
  previousOutput?: unknown;
  prompt: string;
}) => ({
  generationRequestedAt: null,
  isGenerating: false,
  lastGeneratedAt: null,
  ...(previousOutput != null && { output: null }),
  title: fallbackCardTitle(prompt),
});

const generateCardResult = async ({
  dbClient,
  env,
  logId,
  previousTitle,
  prompt,
  tagIds,
}: {
  dbClient: Db;
  env: CloudflareEnv;
  logId: string;
  previousTitle?: string | null;
  prompt: string;
  tagIds: string[];
}) => {
  const sourceSelection = await getTaggedSourceRecordSelection({
    dbClient,
    logId,
    tagIds,
  });

  if (!sourceSelection.records.length) return null;

  return openai.generateCardResult({
    env,
    previousTitle,
    prompt,
    records: sourceSelection.records,
    totalRecordCount: sourceSelection.totalMatchingRecords,
  });
};

const refreshCardResult = async ({
  dbClient,
  env,
  logId,
  previousOutput,
  previousTitle,
  prompt,
  tagIds,
}: {
  dbClient: Db;
  env: CloudflareEnv;
  logId: string;
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  tagIds: string[];
}) => {
  const sourceSelection = await getTaggedSourceRecordSelection({
    dbClient,
    logId,
    tagIds,
  });

  if (!sourceSelection.records.length) return null;

  return openai.refreshCardResult({
    env,
    previousOutput,
    previousTitle,
    prompt,
    records: sourceSelection.records,
    totalRecordCount: sourceSelection.totalMatchingRecords,
  });
};

const tweakCardResult = async ({
  dbClient,
  env,
  logId,
  previousOutput,
  previousTitle,
  prompt,
  tagIds,
  tweakPrompt,
}: {
  dbClient: Db;
  env: CloudflareEnv;
  logId: string;
  previousOutput: cardOutput.CardOutput;
  previousTitle?: string | null;
  prompt: string;
  tagIds: string[];
  tweakPrompt: string;
}) => {
  const sourceSelection = await getTaggedSourceRecordSelection({
    dbClient,
    logId,
    tagIds,
  });

  if (!sourceSelection.records.length) return null;

  return openai.tweakCardResult({
    env,
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

  const records = await getTaggedSourceRecords({
    dbClient,
    limit: 20,
    logId: access.logId,
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

  const prompt = await openai.generateCardPromptSuggestion({
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

  try {
    const result = await generateCardResult({
      dbClient,
      env,
      logId: card.logId,
      previousTitle: card.title,
      prompt: card.prompt,
      tagIds: card.tags?.map((tag) => tag.id) ?? [],
    });

    if (!result) {
      const didWrite = await updateCardIfGenerationCurrent({
        cardId,
        dbClient,
        fields: noSourceRecordGenerationFields({
          previousOutput: card.output,
          prompt: card.prompt,
        }),
        requestedAt,
      });

      return { empty: true, stale: !didWrite, success: didWrite };
    }

    const didWrite = await updateCardIfGenerationCurrent({
      cardId,
      dbClient,
      fields: {
        generationRequestedAt: null,
        isGenerating: false,
        lastGeneratedAt: new Date().toISOString(),
        output: result.output,
        title: result.title,
      },
      requestedAt,
    });

    return {
      output: result.output,
      stale: !didWrite,
      success: didWrite,
      title: result.title,
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
    const result = await refreshCardResult({
      dbClient,
      env,
      logId: card.logId,
      previousOutput,
      previousTitle: card.title,
      prompt: card.prompt,
      tagIds: card.tags?.map((tag) => tag.id) ?? [],
    });

    if (!result) {
      const didWrite = await updateCardIfGenerationCurrent({
        cardId,
        dbClient,
        fields: noSourceRecordGenerationFields({
          previousOutput: card.output,
          prompt: card.prompt,
        }),
        requestedAt,
      });

      return { empty: true, stale: !didWrite, success: didWrite };
    }

    const didWrite = await updateCardIfGenerationCurrent({
      cardId,
      dbClient,
      fields: {
        generationRequestedAt: null,
        isGenerating: false,
        lastGeneratedAt: new Date().toISOString(),
        output: result.output,
        title: result.title,
      },
      requestedAt,
    });

    return {
      output: result.output,
      stale: !didWrite,
      success: didWrite,
      title: result.title,
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
    const result = await tweakCardResult({
      dbClient,
      env,
      logId: card.logId,
      previousOutput,
      previousTitle: card.title,
      prompt: card.prompt,
      tagIds: card.tags?.map((tag) => tag.id) ?? [],
      tweakPrompt,
    });

    if (!result) {
      const didWrite = await updateCardIfGenerationCurrent({
        cardId,
        dbClient,
        fields: noSourceRecordGenerationFields({
          previousOutput: card.output,
          prompt: card.prompt,
        }),
        requestedAt,
      });

      return { empty: true, stale: !didWrite, success: didWrite };
    }

    const didWrite = await updateCardIfGenerationCurrent({
      cardId,
      dbClient,
      fields: {
        generationRequestedAt: null,
        isGenerating: false,
        lastGeneratedAt: new Date().toISOString(),
        output: result.output,
        prompt: result.updatedPrompt,
        title: result.title,
      },
      requestedAt,
    });

    return {
      output: result.output,
      prompt: result.updatedPrompt,
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
    type: 'card.refresh-one',
  });
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
        title: fallbackCardTitle(normalized.prompt),
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
      generationRequestedAt: requestedAt,
      isGenerating: true,
      prompt: normalized.prompt,
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

export const reorderCardsForUser = async ({
  dbClient,
  input,
  userId,
}: {
  dbClient: Db;
  input: CardReorderInput;
  userId: string;
}) => {
  const access = await getManageableLogAccess({
    dbClient,
    logId: input.logId,
    userId,
  });

  const orderedIds = [...new Set(input.orderedIds)].filter(Boolean);
  if (orderedIds.length < 2) return { success: true };

  const { cards } = await dbClient.query({
    cards: {
      $: {
        fields: ['id', 'order'],
        order: { order: 'asc' },
        where: { logId: access.logId },
      },
    },
  });

  const orderedCards = applyOrderedCardIds(cards, orderedIds);

  await dbClient.transact(
    orderedCards.map((card, order) =>
      dbClient.tx.cards[card.id].update({ order })
    )
  );

  return { success: true };
};

export const deleteCard = async ({
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
  await getManageableCard({ cardId, dbClient, userId });
  const requestedAt = new Date().toISOString();

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
        fields: ['id', 'logId', 'prompt', 'teamId', 'title'],
        where: { logId, type: constants.CARD_TYPE_PROGRESS },
      },
      tags: { $: { fields: ['id'] } },
    },
  });

  const matchingCards = (cards as CardEntity[]).filter((card) =>
    cardMatchesRecordTags(card, selectedRecordTagIdSet)
  );

  if (!matchingCards.length) return;
  const now = new Date();
  const requestedAt = now.toISOString();
  const runAfter = addMilliseconds(now, debounceMs);
  const teamId = matchingCards.find((card) => card.teamId)?.teamId;
  if (!teamId) return;

  const markMatchingCardsGenerating = matchingCards.map((card) =>
    dbClient.tx.cards[card.id].update({
      error: '',
      generationRequestedAt: requestedAt,
      isGenerating: true,
    })
  );

  const gate = await getCardRefreshDebounce({ dbClient, logId });

  const mergedTagIds = mergeCardRefreshTagIds(
    gate?.tagIds,
    selectedRecordTagIds
  );

  if (
    isQueuedRefreshDebounceCurrent({
      debounceMs,
      now,
      runAfter: gate?.runAfter,
      status: gate?.status,
    })
  ) {
    await dbClient.transact([
      ...markMatchingCardsGenerating,
      dbClient.tx.cardRefreshDebounces[logId]
        .update({ requestedAt, tagIds: mergedTagIds })
        .link({ log: logId, team: teamId }),
    ]);

    return;
  }

  const token = generateId();

  await dbClient.transact([
    ...markMatchingCardsGenerating,
    dbClient.tx.cardRefreshDebounces[logId]
      .update({
        logId,
        requestedAt,
        runAfter,
        status: 'queued',
        tagIds: mergedTagIds,
        teamId,
        token,
      })
      .link({ log: logId, team: teamId }),
  ]);

  try {
    await enqueueJob(
      env,
      { logId, requestedAt, schemaVersion: 1, token, type: 'card.refresh' },
      { delaySeconds: Math.ceil(debounceMs / 1000) }
    );
  } catch (error) {
    await Promise.all([
      clearCardRefreshDebounceIfCurrent({ dbClient, logId, token }),
      ...matchingCards.map((card) =>
        updateCardIfGenerationCurrent({
          cardId: card.id,
          dbClient,
          fields: { generationRequestedAt: null, isGenerating: false },
          requestedAt,
        })
      ),
    ]);

    throw error;
  }
};

const getCardRefreshDebounce = async ({
  dbClient,
  logId,
}: {
  dbClient: Db;
  logId: string;
}) => {
  const { cardRefreshDebounces } = await dbClient.query({
    cardRefreshDebounces: { $: { where: { id: logId } } },
  });

  return cardRefreshDebounces[0] as CardRefreshDebounceEntity | undefined;
};

const clearCardRefreshDebounceIfCurrent = async ({
  dbClient,
  logId,
  token,
}: {
  dbClient: Db;
  logId: string;
  token: string;
}) => {
  const gate = await getCardRefreshDebounce({ dbClient, logId });
  if (gate?.token !== token) return false;

  await dbClient.transact(
    dbClient.tx.cardRefreshDebounces[logId].update({
      requestedAt: null,
      runAfter: null,
      status: 'idle',
      tagIds: [],
      token: '',
    })
  );

  return true;
};

export const processCardRefreshJob = async ({
  dbClient,
  env,
  isFinalAttempt,
  logId,
  requestedAt,
  token,
}: {
  dbClient: Db;
  env: CloudflareEnv;
  isFinalAttempt?: boolean;
  logId: string;
  requestedAt: string;
  token: string;
}) => {
  const gate = await getCardRefreshDebounce({ dbClient, logId });

  if (gate?.token !== token || gate.status !== 'queued') {
    return { stale: true, success: false };
  }

  const runAfterTime = timeValue(gate.runAfter);
  const now = Date.now();

  if (runAfterTime != null && runAfterTime > now && !isFinalAttempt) {
    return {
      retryAfterSeconds: Math.max(1, Math.ceil((runAfterTime - now) / 1000)),
      success: false,
    };
  }

  await dbClient.transact(
    dbClient.tx.cardRefreshDebounces[logId].update({ requestedAt })
  );

  const selectedRecordTagIds = new Set(readTagIds(gate.tagIds));

  if (!selectedRecordTagIds.size) {
    await clearCardRefreshDebounceIfCurrent({ dbClient, logId, token });
    return { success: true };
  }

  const { cards } = await dbClient.query({
    cards: {
      $: {
        fields: ['id', 'logId', 'prompt', 'title'],
        where: { logId, type: constants.CARD_TYPE_PROGRESS },
      },
      tags: { $: { fields: ['id'] } },
    },
  });

  const refreshCards = (cards as CardEntity[]).filter((card) =>
    cardMatchesRecordTags(card, selectedRecordTagIds)
  );

  for (const card of refreshCards) {
    const generationRequestedAt = new Date().toISOString();

    await dbClient.transact(
      dbClient.tx.cards[card.id].update({
        generationRequestedAt,
        isGenerating: true,
      })
    );

    const result = await refreshCard({
      cardId: card.id,
      dbClient,
      env,
      isFinalAttempt,
      requestedAt: generationRequestedAt,
    });

    const retryDelay =
      result && typeof result === 'object'
        ? result.retryAfterSeconds
        : undefined;

    if (typeof retryDelay === 'number' && retryDelay > 0) return result;
  }

  await clearCardRefreshDebounceIfCurrent({ dbClient, logId, token });
  return { success: true };
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
  const recordTagIds = cardSourceSelection.uniqueCardTagIds(input.tagIds);
  if (!recordTagIds.length) return { success: true };

  const { records } = await dbClient.query({
    records: {
      $: {
        fields: ['id', 'isDraft', 'logId', 'teamId'],
        where: { id: input.recordId },
      },
      author: { user: { $: { fields: ['id'] } } },
      log: {
        team: {
          roles: { $: { fields: ['role', 'userId'], where: { userId } } },
        },
      },
    },
  });

  const record = records[0];

  if (!record?.id) {
    throw new HTTPException(404, { message: 'Record not found' });
  }

  if (record.isDraft) return { success: true };

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
