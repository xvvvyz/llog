import files from '@/api/files';
import logs from '@/api/logs';
import { headers } from '@/api/middleware/headers';
import records from '@/api/records';
import teams from '@/api/teams';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono().basePath('/api/v1');

app.use(headers());

app.route('/files', files);
app.route('/logs', logs);
app.route('/records', records);
app.route('/teams', teams);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  console.error('Unhandled API error', {
    path: c.req.path,
    method: c.req.method,
    error: err,
  });

  return c.json({ message: 'Internal server error' }, 500);
});

export default app;
