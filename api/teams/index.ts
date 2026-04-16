import { Hono } from 'hono';
import invites from './invite-links';
import logMembers from './log-members';
import members from './members';
import membership from './membership';
import redeem from './redeem';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.route('/invite-links', redeem);
app.route('/:teamId/invite-links', invites);
app.route('/:teamId/members', members);
app.route('/:teamId/logs/:logId/members', logMembers);
app.route('/:teamId', membership);

export default app;
