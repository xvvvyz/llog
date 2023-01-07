import createServerSupabaseClient from './create-server-supabase-client';

const listMissionsWithRoutinesAndEvents = (subjectId: string) =>
  createServerSupabaseClient()
    .from('missions')
    .select('id, name, routines(events(id), session)')
    .eq('subject_id', subjectId)
    .order('updated_at', { ascending: false })
    .order('order', { ascending: true, foreignTable: 'routines' });

export type ListMissionsWithRoutinesAndEventsData = Awaited<
  ReturnType<typeof listMissionsWithRoutinesAndEvents>
>['data'];

export default listMissionsWithRoutinesAndEvents;
