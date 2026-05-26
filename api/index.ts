import cards from '@/api/cards';
import files from '@/api/files';
import internal from '@/api/internal';
import { processQueueBatch } from '@/api/jobs/processor';
import { installConsoleErrorSerializer } from '@/api/lib/logging';
import logs from '@/api/logs';
import { createAdminDb } from '@/api/middleware/db';
import { headers } from '@/api/middleware/headers';
import oauth from '@/api/oauth';
import { handleAuthorizationCodeReplay } from '@/api/oauth/authorization-code-replay';
import * as oauthProviderModule from '@/api/oauth/provider';
import push from '@/api/push';
import records from '@/api/records';
import { publishScheduledRecord } from '@/api/records/record-publish';
import type { ScheduledRecordPublishPayload } from '@/api/records/record-scheduler';
import teams from '@/api/teams';
import { getMaxQueueJobDeliveryAttempts } from '@/wrangler.generated';
import { Agent } from 'agents';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const isScheduledRecordPayload = (
  value: unknown
): value is ScheduledRecordPublishPayload => {
  if (typeof value !== 'object' || value === null) return false;
  const payload = value as Partial<ScheduledRecordPublishPayload>;

  return (
    typeof payload.recordId === 'string' &&
    payload.recordId.length > 0 &&
    typeof payload.publishAt === 'string' &&
    payload.publishAt.length > 0
  );
};

export class SchedulingAgent extends Agent<CloudflareEnv> {
  async scheduleRecordPublish(payload: ScheduledRecordPublishPayload) {
    const schedule = await this.schedule(
      new Date(payload.publishAt),
      'publishScheduledRecord',
      payload,
      { idempotent: true }
    );

    return { scheduleId: schedule.id };
  }

  async cancelRecordPublishSchedules({
    exceptScheduleId,
    recordId,
  }: {
    exceptScheduleId?: string;
    recordId: string;
  }) {
    const schedules = await this.listSchedules({ type: 'scheduled' });
    let canceled = 0;

    for (const schedule of schedules) {
      if (schedule.id === exceptScheduleId) continue;
      if (schedule.callback !== 'publishScheduledRecord') continue;
      if (!isScheduledRecordPayload(schedule.payload)) continue;
      if (schedule.payload.recordId !== recordId) continue;
      if (await this.cancelSchedule(schedule.id)) canceled += 1;
    }

    return { canceled };
  }

  async publishScheduledRecord(payload: ScheduledRecordPublishPayload) {
    const dbClient = createAdminDb(this.env);

    return publishScheduledRecord({
      dbClient,
      env: this.env,
      publishAt: payload.publishAt,
      recordId: payload.recordId,
    });
  }
}

installConsoleErrorSerializer();
const api = new Hono().basePath('/api/v1');
api.use(headers());
api.route('/cards', cards);
api.route('/files', files);
api.route('/internal', internal);
api.route('/logs', logs);
api.route('/oauth', oauth);
api.route('/push', push);
api.route('/records', records);
api.route('/teams', teams);

api.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();

  console.error('Unhandled API error', {
    path: c.req.path,
    method: c.req.method,
    error: err,
  });

  return c.json({ message: 'Internal server error' }, 500);
});

const defaultHandler = {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/v1/')) {
      return api.fetch(request, env, ctx);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};

const oauthProvider = oauthProviderModule.createOAuthProvider(defaultHandler);

export default {
  fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    const normalizedRequest = oauthProviderModule.normalizePublicOrigin(
      request,
      env.APP_URL
    );

    return handleAuthorizationCodeReplay(
      normalizedRequest,
      env,
      (nextRequest) => oauthProvider.fetch(nextRequest, env, ctx)
    );
  },
  async queue(batch: MessageBatch<unknown>, env: CloudflareEnv) {
    const db = createAdminDb(env);
    const maxDeliveryAttempts = getMaxQueueJobDeliveryAttempts(env);
    await processQueueBatch({ batch, db, env, maxDeliveryAttempts });
  },
};
