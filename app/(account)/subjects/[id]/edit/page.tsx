import { notFound } from 'next/navigation';
import SubjectForm from '../../../../../components/subject-form';
import Card from '/components/card';
import DeleteSubjectButton from '/components/delete-subject-button';
import createServerSupabaseClient from '/utilities/create-server-supabase-client';

interface PageProps {
  params: {
    id: string;
  };
}

const Page = async ({ params: { id } }: PageProps) => {
  const { data } = await createServerSupabaseClient()
    .from('subjects')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) return notFound();

  return (
    <>
      <Card as="main" breakpoint="xs">
        <SubjectForm {...data} />
      </Card>
      <div className="text-center">
        <DeleteSubjectButton id={id} />
      </div>
    </>
  );
};

export default Page;
