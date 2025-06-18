import { AgentName } from '@/enums/agent-name';
import { getActiveTeamId } from '@/queries/get-active-team-id';
import { db } from '@/utilities/ui/db';
import { agentFetch } from 'agents/client';

export const agent = async (body: string) => {
  const auth = await db.getAuth();
  const teamId = await getActiveTeamId();
  if (!auth || !teamId) return;

  return agentFetch(
    {
      agent: AgentName.AppAgent,
      host: process.env.EXPO_PUBLIC_API_URL!,
      name: teamId,
    },
    {
      body,
      headers: { Authorization: `Bearer ${auth.refresh_token}` },
      method: 'POST',
    }
  );
};
