import createServerSupabaseClient from './create-server-supabase-client';

const getSubjectWithObservations = (subjectId: string) =>
  createServerSupabaseClient()
    .from('subjects')
    .select('id, image_uri, name, observations(description, id, name)')
    .eq('id', subjectId)
    .single();

export type GetSubjectWithObservationsData = Awaited<
  ReturnType<typeof getSubjectWithObservations>
>['data'];

export default getSubjectWithObservations;
