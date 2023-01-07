import createServerSupabaseClient from './create-server-supabase-client';

const getSubjectObservations = (subjectId: string) =>
  createServerSupabaseClient()
    .from('subject_observations')
    .select('observation:observations(description, id, name)')
    .eq('subject_id', subjectId)
    .order('order');

export type GetSubjectObservationsData = Awaited<
  ReturnType<typeof getSubjectObservations>
>['data'];

export default getSubjectObservations;
