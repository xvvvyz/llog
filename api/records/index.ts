import { Hono } from 'hono';
import record from './record';
import replies from './replies';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.route('/:recordId', record);
app.route('/:recordId/replies', replies);

export default app;
