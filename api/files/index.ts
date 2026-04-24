import fileByKey from '@/api/files/file-by-key';
import meAvatar from '@/api/files/me-avatar';
import recordMedia from '@/api/files/record-media';
import replyMedia from '@/api/files/reply-media';
import teamAvatar from '@/api/files/team-avatar';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: CloudflareEnv }>();
app.route('/', meAvatar);
app.route('/', teamAvatar);
app.route('/', recordMedia);
app.route('/', replyMedia);
app.route('/', fileByKey);

export default app;
