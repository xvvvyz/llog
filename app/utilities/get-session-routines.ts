import createServerSupabaseClient from 'utilities/create-server-supabase-client';

const getSessionRoutines = (
  missionId: string,
  sessionNumber: number | string
) =>
  createServerSupabaseClient()
    .from('routines')
    .select('content, id, name, event:events(id)')
    .eq('mission_id', missionId)
    .eq('session', Number(sessionNumber) - 1)
    .order('order', { ascending: true });

export type GetSessionRoutinesData = Awaited<
  ReturnType<typeof getSessionRoutines>
>['data'];

export default getSessionRoutines;
