import record from '@/api/records/record';
import replies from '@/api/records/replies';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: CloudflareEnv }>();
app.route('/', record);
app.route('/', replies);

export default app;
