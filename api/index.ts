import files from '@/api/files';
import { headers } from '@/middleware/headers';
import { Hono } from 'hono';

const app = new Hono().basePath('/api/v1');

app.use(headers());

app.route('/files', files);

export default app;
