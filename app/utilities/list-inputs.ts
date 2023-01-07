import createServerSupabaseClient from './create-server-supabase-client';

const listInputs = () =>
  createServerSupabaseClient()
    .from('inputs')
    .select('id, label')
    .order('updated_at', { ascending: false });

export type ListInputsData = Awaited<ReturnType<typeof listInputs>>['data'];
export default listInputs;
