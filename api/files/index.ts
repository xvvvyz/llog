import { Hono } from 'hono';
import commentMedia from './comment-media';
import fileByKey from './file-by-key';
import meAvatar from './me-avatar';
import recordMedia from './record-media';
import teamAvatar from './team-avatar';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.route('/', fileByKey);
app.route('/me/avatar', meAvatar);
app.route('/teams/:teamId/avatar', teamAvatar);
app.route('/records/:recordId/media', recordMedia);
app.route('/records/:recordId/comments/:commentId/media', commentMedia);

export default app;
