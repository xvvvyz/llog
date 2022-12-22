import SubjectForm from '(account)/subjects/components/subject-form';
import BackButton from 'components/back-button';
import Card from 'components/card';
import Header from 'components/header';
import { notFound } from 'next/navigation';
import createServerSupabaseClient from 'utilities/create-server-supabase-client';

interface PageProps {
  params: {
    subjectId: string;
  };
}

const Page = async ({ params: { subjectId } }: PageProps) => {
  const { data: subject } = await createServerSupabaseClient()
    .from('subjects')
    .select('id, image_uri, name, observations(id, name)')
    .eq('id', subjectId)
    .single();

  if (!subject) return notFound();

  const { data: availableObservations } = await createServerSupabaseClient()
    .from('observations')
    .select('id, name');

  return (
    <>
      <Header>
        <BackButton href="/subjects" />
        <h1 className="text-2xl">Edit subject</h1>
      </Header>
      <Card as="main" breakpoint="sm">
        <SubjectForm
          availableObservations={availableObservations}
          subject={subject}
        />
      </Card>
    </>
  );
};

export default Page;
