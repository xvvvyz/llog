import createServerSupabaseClient from './create-server-supabase-client';

const listEvents = (subjectId: string) =>
  createServerSupabaseClient()
    .from('events')
    .select(
      'created_at, id, observation:observations(id, name), routine:routines(id, name)'
    )
    .order('created_at', { ascending: false })
    .eq('subject_id', subjectId);

export type ListEvents = Awaited<ReturnType<typeof listEvents>>['data'];
export default listEvents;
