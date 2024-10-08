import createServerSupabaseClient from '@/_utilities/create-server-supabase-client';

const getEventTypeWithInputsAndOptions = async (eventTypeId: string) =>
  (await createServerSupabaseClient())
    .from('event_types')
    .select(
      `
      content,
      id,
      inputs:event_type_inputs(
        input:inputs(
          id,
          label,
          options:input_options(id, label),
          settings,
          type
        )
      ),
      name,
      order`,
    )
    .eq('id', eventTypeId)
    .order('order', { referencedTable: 'inputs' })
    .order('order', { referencedTable: 'inputs.input.options' })
    .single();

export type GetEventTypeWithInputsAndOptionsData = Awaited<
  ReturnType<typeof getEventTypeWithInputsAndOptions>
>['data'];

export default getEventTypeWithInputsAndOptions;
