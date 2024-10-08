import createServerSupabaseClient from '@/_utilities/create-server-supabase-client';

const getSession = async (sessionId: string) =>
  (await createServerSupabaseClient())
    .from('sessions')
    .select(
      `
      draft,
      id,
      order,
      modules:event_types(
        content,
        event:events(id),
        id,
        inputs:event_type_inputs(input_id),
        name,
        order
      ),
      scheduled_for,
      title`,
    )
    .eq('id', sessionId)
    .eq('modules.archived', false)
    .order('order', { referencedTable: 'modules' })
    .order('order', { referencedTable: 'modules.inputs' })
    .single();

export type GetSessionData = Awaited<ReturnType<typeof getSession>>['data'];

export default getSession;
