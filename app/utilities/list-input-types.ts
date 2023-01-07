import createServerSupabaseClient from './create-server-supabase-client';

const listInputTypes = () =>
  createServerSupabaseClient().from('input_types').select('id, label');

export type ListInputTypesData = Awaited<
  ReturnType<typeof listInputTypes>
>['data'];

export default listInputTypes;
