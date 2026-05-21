import type { Db } from '@/api/middleware/db';
import * as openrouter from '@/api/cards/openrouter';
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

const fallbackCardTitle = (prompt: string) => {
  const firstLine = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return (
    cardOutput.normalizeCardDisplayLabel({
      defaultValue: 'Progress card',
      maxLength: CARD_TITLE_MAX_LENGTH,
      value: firstLine ?? prompt,
    }) ?? 'Progress card'
  );
};

const readCardOutput = (value: unknown) => {
  const parsed = cardOutput.validateCardOutput(value);
  return parsed.success ? parsed.data : undefined;
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
  prompt,
  tagIds,
}: {
  dbClient: Db;
  env: CloudflareEnv;
  logId: string;
  prompt: string;
  tagIds: string[];
}) => {
  const sourceSelection = await getTaggedSourceRecordSelection({
    dbClient,
    logId,
    tagIds,
  });

  if (!sourceSelection.records.length) return null;

  return openrouter.generateCardResult({
    env,
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

  return openrouter.refreshCardResult({
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

  return openrouter.tweakCardResult({
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
      },
      requestedAt,
    });

    const title = card.title ?? fallbackCardTitle(card.prompt);

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
