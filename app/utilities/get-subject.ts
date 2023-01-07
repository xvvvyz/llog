import createServerSupabaseClient from './create-server-supabase-client';

const getSubject = (subjectId: string) =>
  createServerSupabaseClient()
    .from('subjects')
    .select('id, image_uri, name')
    .eq('id', subjectId)
    .single();

export type GetSubjectData = Awaited<ReturnType<typeof getSubject>>['data'];
export default getSubject;
