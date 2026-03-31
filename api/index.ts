import files from '@/api/files';
import logs from '@/api/logs';
import records from '@/api/records';
import teams from '@/api/teams';
import { headers } from '@/middleware/headers';
import { Hono } from 'hono';

const app = new Hono().basePath('/api/v1');

app.use(headers());

app.route('/files', files);
app.route('/logs', logs);
app.route('/records', records);
app.route('/teams', teams);

export default app;
