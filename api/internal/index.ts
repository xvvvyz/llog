import acrcloudWebhook from '@/api/internal/acrcloud-webhook';
import streamWebhook from '@/api/internal/stream-webhook';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: CloudflareEnv }>();
app.route('/', acrcloudWebhook);
app.route('/', streamWebhook);

export default app;
