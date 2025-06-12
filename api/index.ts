import { AppAgent } from '@/agent';
import files from '@/api/files';
import me from '@/api/me';
import { agents } from '@/middleware/agents';
import { headers } from '@/middleware/headers';
import { Hono } from 'hono';

const app = new Hono().basePath('/api/v1');

app.use(headers());
app.use('/agents/*', agents());

app.route('/me', me);
app.route('/files', files);

export { AppAgent };
export default app;
