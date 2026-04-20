import { finalizeStreamVideo } from '@/api/files/media-processing';
import { verifyStreamWebhook } from '@/api/files/stream';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.post('/stream/webhook', async (c) => {
  const body = await c.req.text();

  if (!(await verifyStreamWebhook(c, body))) {
    throw new HTTPException(401, {
      message: 'Invalid Stream webhook signature',
    });
  }

  const event = JSON.parse(body) as {
    duration?: number;
    playback?: { hls?: string | null };
    readyToStream?: boolean;
    status?: { errorReasonText?: string; state?: string };
    thumbnail?: string | null;
    uid?: string;
  };

  if (!event.uid) {
    return c.json({ ignored: true, success: true });
  }

  if (event.readyToStream && event.status?.state === 'ready') {
    c.executionCtx.waitUntil(
      finalizeStreamVideo({
        duration: event.duration,
        env: c.env,
        hlsUri: event.playback?.hls,
        streamUid: event.uid,
        thumbnailUri: event.thumbnail,
      })
    );
  }

  return c.json({ success: true });
});

export default app;
