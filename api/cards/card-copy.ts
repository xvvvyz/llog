import type { Db } from '@/api/middleware/db';
import { enqueueJob } from '@/api/jobs/payload';
import * as cardBlueprint from '@/domain/cards/blueprint';
import * as copyTags from '@/domain/cards/copy-tags';
import * as constants from '@/domain/cards/constants';
import * as cardTitle from '@/domain/cards/title';
import * as permissions from '@/domain/teams/permissions';
import { id as generateId } from '@instantdb/admin';
import { HTTPException } from 'hono/http-exception';
import * as cardActions from '@/api/cards/card-actions';

export type CardCopyInput = { logIds: string[] };

type CardCopySource = {
  id: string;
  logId?: string | null;
  output?: unknown;
  prompt?: string | null;
  tags?: { color?: number | null; id: string; name?: string | null }[];
  title?: string | null;
};

const trimRequired = (value: string, maxLength: number, message: string) => {
  const trimmed = value.trim();

  if (!trimmed || trimmed.length > maxLength) {
    throw new HTTPException(400, { message });
  }

  return trimmed;
};

const normalizeCardCopyTargetLogIds = (logIds: string[]) => {
  const targetLogIds = [...new Set(logIds.map((logId) => logId.trim()))];

  if (targetLogIds.some((logId) => !logId)) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  return targetLogIds;
};

const getManageableSourceCard = async ({
  cardId,
  dbClient,
  userId,
}: {
  cardId: string;
  dbClient: Db;
  userId: string;
}) => {
  const { cards } = await dbClient.query({
    cards: {
      $: { where: { id: cardId } },
      tags: { $: { fields: ['color', 'id', 'name'] } },
    },
  });

  const card = cards[0] as CardCopySource | undefined;

  if (!card?.id || !card.logId) {
    throw new HTTPException(404, { message: 'Card not found' });
  }

  await assertManageableLog({
    dbClient,
    invalidMessage: 'Card not found',
    invalidStatus: 404,
    logId: card.logId,
    userId,
  });

  return card;
};

const assertManageableLog = async ({
  dbClient,
  invalidMessage,
  invalidStatus,
  logId,
  userId,
}: {
  dbClient: Db;
  invalidMessage: string;
  invalidStatus: 400 | 404;
  logId: string;
  userId: string;
}) => {
  const { logs } = await dbClient.query({
    logs: {
      $: { fields: ['id', 'teamId'], where: { id: logId } },
      team: { roles: { $: { fields: ['role'], where: { userId } } } },
    },
  });

  const log = logs[0];

  if (!log?.id || !log.teamId) {
    throw new HTTPException(invalidStatus, { message: invalidMessage });
  }

  if (!permissions.canManageTeam(log.team?.roles?.[0]?.role)) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  return { id: log.id, teamId: log.teamId };
};

const assertManageableTargetLogs = async ({
  dbClient,
  targetLogIds,
  userId,
}: {
  dbClient: Db;
  targetLogIds: string[];
  userId: string;
}) => {
  const { logs } = await dbClient.query({
    logs: {
      $: { fields: ['id', 'teamId'], where: { id: { $in: targetLogIds } } },
      team: { roles: { $: { fields: ['role'], where: { userId } } } },
    },
  });

  const logsById = new Map(logs.map((log) => [log.id, log]));

  return targetLogIds.map((logId) => {
    const log = logsById.get(logId);

    if (!log?.id || !log.teamId) {
      throw new HTTPException(400, { message: 'Invalid target log' });
    }

    if (!permissions.canManageTeam(log.team?.roles?.[0]?.role)) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    return { id: log.id, teamId: log.teamId };
  });
};

const getNextCardOrderFromExisting = (
  cards: { order?: number | null }[] = []
) =>
  Math.max(
    0,
    ...cards.map((card) => (typeof card.order === 'number' ? card.order : 0))
  ) + 1;

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

const markCopiedCardsFailed = async ({
  cardIds,
  dbClient,
}: {
  cardIds: string[];
  dbClient: Db;
}) => {
  if (!cardIds.length) return;

  await dbClient.transact(
    cardIds.map((cardId) =>
      dbClient.tx.cards[cardId].update({
        error: cardActions.CARD_GENERATION_ERROR_MESSAGE,
        generationRequestedAt: null,
        isGenerating: false,
      })
    )
  );
};

export const copyCard = async ({
  cardId,
  dbClient,
  env,
  input,
  userId,
}: {
  cardId: string;
  dbClient: Db;
  env: CloudflareEnv;
  input: CardCopyInput;
  userId: string;
}) => {
  const targetLogIds = normalizeCardCopyTargetLogIds(input.logIds);

  if (!targetLogIds.length) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  const sourceCard = await getManageableSourceCard({
    cardId,
    dbClient,
    userId,
  });

  const prompt = trimRequired(
    sourceCard.prompt ?? '',
    constants.CARD_PROMPT_MAX_LENGTH,
    'Invalid prompt'
  );

  const copiedTitle =
    sourceCard.title?.trim() || cardTitle.fallbackCardTitle(prompt);

  const targetLogs = await assertManageableTargetLogs({
    dbClient,
    targetLogIds,
    userId,
  });

  const targetTeamIds = [
    ...new Set(targetLogs.map((targetLog) => targetLog.teamId)),
  ];

  const [{ tags }, { cards }] = await Promise.all([
    dbClient.query({
      tags: {
        $: {
          fields: ['color', 'id', 'name', 'order', 'teamId', 'type'],
          order: { order: 'asc' },
          where: { teamId: { $in: targetTeamIds }, type: 'record' },
        },
        logs: { $: { fields: ['id'] } },
      },
    }),
    dbClient.query({
      cards: {
        $: {
          fields: ['logId', 'order'],
          where: { logId: { $in: targetLogIds } },
        },
      },
    }),
  ]);

  const tagsByLogId = new Map<string, typeof tags>();
  const cardsByLogId = new Map<string, typeof cards>();

  for (const tag of tags ?? []) {
    for (const log of tag.logs ?? []) {
      if (!log.id) continue;
      const logTags = tagsByLogId.get(log.id) ?? [];
      logTags.push(tag);
      tagsByLogId.set(log.id, logTags);
    }
  }

  for (const card of cards ?? []) {
    if (!card.logId) continue;
    const logCards = cardsByLogId.get(card.logId) ?? [];
    logCards.push(card);
    cardsByLogId.set(card.logId, logCards);
  }

  const copiedCards: { id: string; logId: string }[] = [];
  const requestedAt = new Date().toISOString();
  const blueprint = cardBlueprint.createCardBlueprint(sourceCard.output);
  const transactions = [];

  for (const targetLog of targetLogs) {
    const copiedCardId = generateId();

    const tagPlan = copyTags.resolveCopyCardTagsForTargetLog({
      sourceTags: sourceCard.tags,
      targetTags: tagsByLogId.get(targetLog.id),
    });

    const createdTagIds: string[] = [];
    const targetTags = tagsByLogId.get(targetLog.id) ?? [];
    const missingTagCount = tagPlan.missingTags.length;

    if (missingTagCount > 0) {
      transactions.push(
        ...targetTags.map((tag, index) =>
          dbClient.tx.tags[tag.id].update({ order: index + missingTagCount })
        )
      );
    }

    for (const [index, tag] of tagPlan.missingTags.entries()) {
      const tagId = generateId();
      createdTagIds.push(tagId);

      transactions.push(
        dbClient.tx.tags[tagId]
          .update({
            color: tag.color,
            name: tag.name,
            order: index,
            teamId: targetLog.teamId,
            type: 'record',
          })
          .link({ logs: targetLog.id, team: targetLog.teamId })
      );
    }

    const cardTagIds = [...tagPlan.linkedTagIds, ...createdTagIds];

    if (!cardTagIds.length || cardTagIds.length > cardActions.MAX_CARD_TAGS) {
      throw new HTTPException(400, { message: 'Invalid source tags' });
    }

    copiedCards.push({ id: copiedCardId, logId: targetLog.id });

    transactions.push(
      dbClient.tx.cards[copiedCardId]
        .update({
          ...(blueprint && { blueprint }),
          generationRequestedAt: requestedAt,
          isGenerating: true,
          logId: targetLog.id,
          order: getNextCardOrderFromExisting(
            cardsByLogId.get(targetLog.id) ?? []
          ),
          prompt,
          teamId: targetLog.teamId,
          title: copiedTitle,
          type: constants.CARD_TYPE_PROGRESS,
        })
        .link({ log: targetLog.id, team: targetLog.teamId }),
      ...cardTagIds.map((tagId) =>
        dbClient.tx.cards[copiedCardId].link({ tags: tagId })
      )
    );
  }

  await dbClient.transact(transactions);
  const enqueuedCardIds = new Set<string>();

  try {
    for (const copiedCard of copiedCards) {
      await enqueueCardGenerateJob({ cardId: copiedCard.id, env, requestedAt });
      enqueuedCardIds.add(copiedCard.id);
    }
  } catch (error) {
    await markCopiedCardsFailed({
      cardIds: copiedCards
        .map((card) => card.id)
        .filter((id) => !enqueuedCardIds.has(id)),
      dbClient,
    });

    throw error;
  }

  return { cards: copiedCards, queued: true, success: true };
};
