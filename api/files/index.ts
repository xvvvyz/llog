import { Hono } from 'hono';
import fileByKey from './file-by-key';
import meAvatar from './me-avatar';
import recordMedia from './record-media';
import replyMedia from './reply-media';
import teamAvatar from './team-avatar';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.route('/', meAvatar);
app.route('/', teamAvatar);
app.route('/', recordMedia);
app.route('/', replyMedia);
app.route('/', fileByKey);

export default app;
