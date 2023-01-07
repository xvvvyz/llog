import createServerSupabaseClient from './create-server-supabase-client';

const getObservation = (observationId: string) =>
  createServerSupabaseClient()
    .from('observations')
    .select(
      'description, id, name, inputs:observation_inputs(input:inputs(id, label), order)'
    )
    .eq('id', observationId)
    .order('order', { ascending: true, foreignTable: 'observation_inputs' })
    .single();

export type GetObservationData = Awaited<
  ReturnType<typeof getObservation>
>['data'];

export default getObservation;
