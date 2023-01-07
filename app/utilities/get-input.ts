import createServerSupabaseClient from './create-server-supabase-client';

const getInput = (inputId: string) =>
  createServerSupabaseClient()
    .from('inputs')
    .select('id, label, options:input_options(id, label), type:input_types(*)')
    .eq('id', inputId)
    .order('order', { ascending: true, foreignTable: 'input_options' })
    .single();

export type GetInputData = Awaited<ReturnType<typeof getInput>>['data'];
export default getInput;
