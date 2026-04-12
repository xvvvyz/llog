import { Hono } from 'hono';
import log from './log';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.route('/:logId', log);

export default app;
