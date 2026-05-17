import logMembers from '@/api/teams/log-members';
import members from '@/api/teams/members';
import membership from '@/api/teams/membership';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: CloudflareEnv }>();
app.route('/', members);
app.route('/', logMembers);
app.route('/', membership);

export default app;
