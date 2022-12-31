import createServerSupabaseClient from '../../../../../utilities/create-server-supabase-client';

const getSubject = (subjectId: string) =>
  createServerSupabaseClient()
    .from('subjects')
    .select('id, image_uri, name')
    .eq('id', subjectId)
    .single();

export default getSubject;
