import { Hono } from 'hono';
import comments from './comments';
import record from './record';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.route('/:recordId', record);
app.route('/:recordId/comments', comments);

export default app;
