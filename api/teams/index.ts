import invites from '@/api/teams/invite-links';
import logMembers from '@/api/teams/log-members';
import members from '@/api/teams/members';
import membership from '@/api/teams/membership';
import redeem from '@/api/teams/redeem';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: CloudflareEnv }>();
app.route('/invite-links', redeem);
app.route('/', invites);
app.route('/', members);
app.route('/', logMembers);
app.route('/', membership);

export default app;
