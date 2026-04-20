import { Hono } from 'hono';
import streamWebhook from './stream-webhook';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.route('/', streamWebhook);

export default app;
