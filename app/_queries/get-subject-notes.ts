import createServerSupabaseClient from '@/_utilities/create-server-supabase-client';

const getSubjectNotes = (subjectId: string) =>
  createServerSupabaseClient()
    .from('subject_notes')
    .select('content, id')
    .eq('id', subjectId)
    .single();

export type GetSubjectNotesData = Awaited<
  ReturnType<typeof getSubjectNotes>
>['data'];

export default getSubjectNotes;