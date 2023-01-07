import createServerSupabaseClient from './create-server-supabase-client';

const getLastMissionRoutine = (missionId: string) =>
  createServerSupabaseClient()
    .from('routines')
    .select('session')
    .eq('mission_id', missionId)
    .order('order', { ascending: false })
    .limit(1);

export type GetLastMissionRoutineData = Awaited<
  ReturnType<typeof getLastMissionRoutine>
>['data'];

export default getLastMissionRoutine;
