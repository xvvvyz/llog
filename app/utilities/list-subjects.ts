import createServerSupabaseClient from './create-server-supabase-client';

const listSubjects = () =>
  createServerSupabaseClient()
    .from('subjects')
    .select('id, image_uri, name')
    .order('updated_at', { ascending: false });

export type ListSubjectsData = Awaited<ReturnType<typeof listSubjects>>['data'];
export default listSubjects;
