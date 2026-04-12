import { Hono } from 'hono';
import inviteLinks from './invite-links';
import logMembers from './log-members';
import teamInviteLinks from './team-invite-links';
import teamMembers from './team-members';
import teamMembership from './team-membership';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.route('/invite-links', inviteLinks);
app.route('/:teamId/invite-links', teamInviteLinks);
app.route('/:teamId/members', teamMembers);
app.route('/:teamId/logs/:logId/members', logMembers);
app.route('/:teamId', teamMembership);

export default app;
