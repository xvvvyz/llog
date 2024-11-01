'use server';

import { InputFormValues } from '@/_components/input-form';
import InputType from '@/_constants/enum-input-type';
import getCurrentUser from '@/_queries/get-current-user';
import createServerSupabaseClient from '@/_utilities/create-server-supabase-client';
import { revalidatePath } from 'next/cache';

type State = { error?: string; data?: { id: string; label: string } } | null;

const upsertInput = async (
  context: { inputId?: string },
  data: InputFormValues,
): Promise<State> => {
  const supabase = await createServerSupabaseClient();
  const user = await getCurrentUser();
  const type = data.type.id;

  const { data: input, error } = await supabase
    .from('inputs')
    .upsert({
      id: context.inputId,
      label: data.label.trim(),
      settings: data.settings,
      team_id: user?.app_metadata?.active_team_id,
      type,
    })
    .select('id, label')
    .single();

  if (error) return { error: error.message };

  if (type === InputType.Select || type === InputType.MultiSelect) {
    const { insertedOptions, updatedOptionIds, updatedOptions } =
      data.options.reduce<{
        insertedOptions: InputFormValues['options'];
        updatedOptionIds: string[];
        updatedOptions: InputFormValues['options'];
      }>(
        (acc, option, order) => {
          const payload: InputFormValues['options'][0] = {
            input_id: input.id,
            label: option.label.trim(),
            order,
          };

          if (option.id) {
            payload.id = option.id;
            acc.updatedOptions.push(payload);
            acc.updatedOptionIds.push(option.id);
          } else {
            acc.insertedOptions.push(payload);
          }

          return acc;
        },
        { insertedOptions: [], updatedOptionIds: [], updatedOptions: [] },
      );

    await supabase
      .from('input_options')
      .delete()
      .eq('input_id', input.id)
      .not('id', 'in', `(${updatedOptionIds.join(',')})`);

    if (updatedOptions.length) {
      const { error } = await supabase
        .from('input_options')
        .upsert(updatedOptions);

      if (error) {
        if (!context.inputId) {
          await supabase.from('inputs').delete().eq('id', input.id);
        }

        return { error: error.message };
      }
    }

    if (insertedOptions.length) {
      const { error } = await supabase
        .from('input_options')
        .insert(insertedOptions);

      if (error) {
        if (!context.inputId) {
          await supabase.from('inputs').delete().eq('id', input.id);
        }

        return { error: error.message };
      }
    }
  }

  await supabase.from('input_subjects').delete().eq('input_id', input.id);

  if (data.subjects.length) {
    const { error } = await supabase.from('input_subjects').insert(
      data.subjects.map(({ id }) => ({
        input_id: input.id,
        subject_id: id,
      })),
    );

    if (error) {
      if (!context.inputId) {
        await supabase.from('inputs').delete().eq('id', input.id);
      }

      return { error: error.message };
    }
  }

  revalidatePath('/', 'layout');
  return { data: input };
};

export default upsertInput;
