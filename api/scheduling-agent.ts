import { createAdminDb } from '@/api/middleware/db';
import { publishScheduledRecord } from '@/api/records/record-publish';
import type { ScheduledRecordPublishPayload } from '@/api/records/record-scheduler';
import { Agent } from 'agents';

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
