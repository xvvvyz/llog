import { Hono } from 'hono';
import invites from './invite-links';
import logMembers from './log-members';
import members from './members';
import membership from './membership';
import redeem from './redeem';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.route('/invite-links', redeem);
app.route('/', invites);
app.route('/', members);
app.route('/', logMembers);
app.route('/', membership);

export default app;
