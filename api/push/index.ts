import { auth, db } from '@/api/middleware/db';
import * as push from '@/api/push/helpers';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.get('/subscriptions/me', db(), auth(), async (c) => {
  const subscriptions = await push.listUserPushSubscriptions(
    c.var.db,
    c.var.user.id
  );

  return c.json({ subscriptions });
});

app.post(
  '/subscriptions',
  db(),
  auth(),
  zValidator('json', z.object({ subscription: push.pushSubscriptionSchema })),
  async (c) => {
    const { subscription } = c.req.valid('json');

    const subscriptionId = await push.upsertPushSubscription(
      c.var.db,
      c.var.user.id,
      subscription
    );

    return c.json({
      enabled: true,
      id: subscriptionId,
      endpoint: subscription.endpoint,
    });
  }
);

app.delete(
  '/subscriptions',
  db(),
  auth(),
  zValidator('json', z.object({ endpoint: z.string().url() })),
  async (c) => {
    const { endpoint } = c.req.valid('json');
    await push.deletePushSubscriptionByEndpoint(
      c.var.db,
      c.var.user.id,
      endpoint
    );
    return c.json({ enabled: false, endpoint });
  }
);

export default app;
