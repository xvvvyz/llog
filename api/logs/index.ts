import log from '@/api/logs/log';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: CloudflareEnv }>();
app.route('/', log);

export default app;
