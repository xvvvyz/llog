import type { SchedulingAgent } from '@/api/index';

export type ScheduledRecordPublishPayload = {
  publishAt: string;
  recordId: string;
};

type SchedulerEnv = CloudflareEnv & {
  SCHEDULING_AGENT?: DurableObjectNamespace<SchedulingAgent>;
};

const SCHEDULER_AGENT_NAME = 'records';

const getSchedulerAgent = async (env: CloudflareEnv) => {
  const namespace = (env as SchedulerEnv).SCHEDULING_AGENT;
  if (!namespace) throw new Error('Scheduling agent is not configured');
  const { getAgentByName } = await import('agents');
  return getAgentByName(namespace, SCHEDULER_AGENT_NAME);
};

export const scheduleRecordPublish = async (
  env: CloudflareEnv,
  payload: ScheduledRecordPublishPayload
) => {
  const scheduler = await getSchedulerAgent(env);
  return scheduler.scheduleRecordPublish(payload);
};

export const cancelRecordPublishSchedules = async (
  env: CloudflareEnv,
  recordId: string,
  options?: { exceptScheduleId?: string }
) => {
  const scheduler = await getSchedulerAgent(env);

  return scheduler.cancelRecordPublishSchedules(
    options?.exceptScheduleId
      ? { exceptScheduleId: options.exceptScheduleId, recordId }
      : { recordId }
  );
};
