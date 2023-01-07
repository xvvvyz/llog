import createServerSupabaseClient from './create-server-supabase-client';

const getMissionWithRoutines = (missionId: string) =>
  createServerSupabaseClient()
    .from('missions')
    .select('id, name, routines(content, id, name, order, session)')
    .eq('id', missionId)
    .order('order', { ascending: true, foreignTable: 'routines' })
    .single();

export type GetMissionWithRoutinesData = Awaited<
  ReturnType<typeof getMissionWithRoutines>
>['data'];

export default getMissionWithRoutines;
