import streamWebhook from '@/api/internal/stream-webhook';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: CloudflareEnv }>();
app.route('/', streamWebhook);

export default app;
