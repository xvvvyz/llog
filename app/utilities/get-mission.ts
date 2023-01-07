import createServerSupabaseClient from 'utilities/create-server-supabase-client';

const getMission = (missionId: string) =>
  createServerSupabaseClient()
    .from('missions')
    .select('name')
    .eq('id', missionId)
    .single();

export type GetMissionData = Awaited<ReturnType<typeof getMission>>['data'];
export default getMission;
