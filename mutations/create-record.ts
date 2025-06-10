import { AgentName } from '@/enums/agent-name';
import { getProfile } from '@/queries/get-profile';
import { agent } from '@/utilities/ui/agent';
import { db } from '@/utilities/ui/db';
import { id } from '@instantdb/react-native';

export const createRecord = async ({
  logId,
  text,
}: {
  logId: string;
  text: string;
}) => {
  const profile = await getProfile();
  if (!profile) return;
  const recordId = id();

  await db.transact(
    db.tx.records[recordId]
      .update({ date: new Date().toISOString(), text })
      .link({ author: profile.id, log: logId })
  );

  void agent(AgentName.TeamAgent, `New record created: ${recordId}`);
};
