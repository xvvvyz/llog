import createServerSupabaseClient from './create-server-supabase-client';

const listObservations = () =>
  createServerSupabaseClient()
    .from('observations')
    .select('id, name')
    .order('updated_at', { ascending: false });

export type ListObservationsData = Awaited<
  ReturnType<typeof listObservations>
>['data'];

export default listObservations;
