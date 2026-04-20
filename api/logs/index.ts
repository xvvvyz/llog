import { Hono } from 'hono';
import log from './log';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.route('/', log);

export default app;
