import { Hono } from 'hono';
import record from './record';
import replies from './replies';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.route('/', record);
app.route('/', replies);

export default app;
