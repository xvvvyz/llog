'use server';

import { TemplateFormValues } from '@/_components/template-form';
import createServerSupabaseClient from '@/_utilities/create-server-supabase-client';
import sanitizeHtml from '@/_utilities/sanitize-html';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type State = { data?: { id?: string }; error?: string } | null;

const upsertTemplate = async (
  context: { next?: string; templateId?: string },
  data: TemplateFormValues,
): Promise<State> => {
  const supabase = createServerSupabaseClient();

  const { data: template, error } = await supabase
    .from('templates')
    .upsert({
      data: {
        content: sanitizeHtml(data.content),
        inputIds: data.inputs.map((input) => input.id),
      },
      id: context.templateId,
      name: data.name.trim(),
      public: false,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  if (context.next) redirect(context.next);
  return { data: template };
};

export default upsertTemplate;