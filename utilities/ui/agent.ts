import { getActiveTeamId } from '@/queries/get-active-team-id';
import { db } from '@/utilities/ui/db';
import { agentFetch } from 'agents/client';

export const agent = async (name: string, text: string) => {
  const auth = await db.getAuth();
  const teamId = await getActiveTeamId();
  if (!auth || !teamId) return;

  return agentFetch(
    {
      agent: name,
      host: `${process.env.EXPO_PUBLIC_API_URL}`,
      name: teamId,
    },
    {
      body: text,
      headers: { Authorization: `Bearer ${auth.refresh_token}` },
      method: 'POST',
    }
  );
};
