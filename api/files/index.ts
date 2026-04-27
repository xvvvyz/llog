import fileByKey from '@/api/files/file-by-key';
import meAvatar from '@/api/files/me-avatar';
import recordFiles from '@/api/files/record-files';
import replyFiles from '@/api/files/reply-files';
import teamAvatar from '@/api/files/team-avatar';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: CloudflareEnv }>();
app.route('/', meAvatar);
app.route('/', teamAvatar);
app.route('/', recordFiles);
app.route('/', replyFiles);
app.route('/', fileByKey);

export default app;
