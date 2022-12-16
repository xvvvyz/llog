import { notFound } from 'next/navigation';
import SubjectForm from '../../../../../components/subject-form';
import BackButton from '/components/back-button';
import Card from '/components/card';
import Header from '/components/header';
import createServerSupabaseClient from '/utilities/create-server-supabase-client';

interface PageProps {
  params: {
    id: string;
  };
}

const Page = async ({ params: { id } }: PageProps) => {
  const { data } = await createServerSupabaseClient()
    .from('subjects')
    .select('id, image_uri, name')
    .eq('id', id)
    .single();

  if (!data) return notFound();

  return (
    <>
      <Header>
        <BackButton href="/subjects" />
        <h1 className="text-2xl">Edit subject</h1>
      </Header>
      <Card as="main" breakpoint="sm">
        <SubjectForm {...data} />
      </Card>
    </>
  );
};

export default Page;
