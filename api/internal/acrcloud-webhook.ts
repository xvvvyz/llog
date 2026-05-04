import { handleAcrCloudWebhook } from '@/api/audio-analysis';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.post('/acrcloud/webhook', async (c) => {
  const token = c.req.query('token');

  if (!token || token !== c.env.ACRCLOUD_WEBHOOK_SECRET) {
    throw new HTTPException(401, { message: 'Invalid ACRCloud webhook token' });
  }

  return c.json(
    await handleAcrCloudWebhook({ body: await c.req.json(), env: c.env })
  );
});

export default app;
