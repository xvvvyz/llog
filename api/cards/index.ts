import * as cardActions from '@/api/cards/card-actions';
import { auth, db } from '@/api/middleware/db';
import { CARD_PROMPT_MAX_LENGTH } from '@/domain/cards/constants';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

const cardWriteSchema = z.object({
  prompt: z.string().min(1).max(CARD_PROMPT_MAX_LENGTH),
  tagIds: z.array(z.string().min(1)).min(1).max(cardActions.MAX_CARD_TAGS),
});

const cardCreateSchema = cardWriteSchema.extend({ logId: z.string().min(1) });

const cardPromptSuggestionSchema = z.object({
  cardId: z.string().min(1).optional(),
  logId: z.string().min(1),
  tagIds: z.array(z.string().min(1)).min(1).max(cardActions.MAX_CARD_TAGS),
});

const cardTweakSchema = z.object({
  prompt: z.string().min(1).max(cardActions.CARD_TWEAK_PROMPT_MAX_LENGTH),
});

const cardReorderSchema = z.object({
  logId: z.string().min(1),
  orderedIds: z
    .array(z.string().min(1))
    .min(1)
    .max(cardActions.MAX_CARD_REORDER_IDS),
});

const cardRecordRefreshSchema = z.object({
  recordId: z.string().min(1),
  tagIds: z.array(z.string().min(1)).min(1).max(cardActions.MAX_CARD_TAGS),
});

app.post('/', db(), auth(), zValidator('json', cardCreateSchema), async (c) => {
  const card = await cardActions.createCard({
    dbClient: c.var.db,
    env: c.env,
    input: c.req.valid('json'),
    userId: c.var.user.id,
  });

  return c.json(card);
});

app.post(
  '/suggest-prompt',
  db(),
  auth(),
  zValidator('json', cardPromptSuggestionSchema),
  async (c) => {
    const suggestion = await cardActions.suggestCardPrompt({
      dbClient: c.var.db,
      env: c.env,
      input: c.req.valid('json'),
      userId: c.var.user.id,
    });

    return c.json(suggestion);
  }
);

app.post(
  '/reorder',
  db(),
  auth(),
  zValidator('json', cardReorderSchema),
  async (c) => {
    const result = await cardActions.reorderCardsForUser({
      dbClient: c.var.db,
      input: c.req.valid('json'),
      userId: c.var.user.id,
    });

    return c.json(result);
  }
);

app.post(
  '/refresh-record',
  db(),
  auth(),
  zValidator('json', cardRecordRefreshSchema),
  async (c) => {
    const result = await cardActions.refreshRecordCardsForUser({
      dbClient: c.var.db,
      env: c.env,
      input: c.req.valid('json'),
      userId: c.var.user.id,
    });

    return c.json(result);
  }
);

app.put(
  '/:cardId',
  db(),
  auth(),
  zValidator('json', cardWriteSchema),
  async (c) => {
    const card = await cardActions.updateCard({
      cardId: c.req.param('cardId'),
      dbClient: c.var.db,
      env: c.env,
      input: c.req.valid('json'),
      userId: c.var.user.id,
    });

    return c.json(card);
  }
);

app.post(
  '/:cardId/tweak',
  db(),
  auth(),
  zValidator('json', cardTweakSchema),
  async (c) => {
    const result = await cardActions.tweakCardForUser({
      cardId: c.req.param('cardId'),
      dbClient: c.var.db,
      env: c.env,
      input: c.req.valid('json'),
      userId: c.var.user.id,
    });

    return c.json(result);
  }
);

app.post('/:cardId/refresh', db(), auth(), async (c) => {
  const result = await cardActions.refreshCardForUser({
    cardId: c.req.param('cardId'),
    dbClient: c.var.db,
    env: c.env,
    userId: c.var.user.id,
  });

  return c.json(result);
});

app.delete('/:cardId', db(), auth(), async (c) => {
  const result = await cardActions.deleteCard({
    cardId: c.req.param('cardId'),
    dbClient: c.var.db,
    userId: c.var.user.id,
  });

  return c.json(result);
});

export default app;
