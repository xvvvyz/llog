import BackButton from 'components/back-button';
import Card from 'components/card';
import Header from 'components/header';
import { notFound } from 'next/navigation';
import createServerSupabaseClient from 'utilities/create-server-supabase-client';
import ObservationForm from '../../components/observation-form';

interface PageProps {
  params: {
    observationId: string;
  };
}

const Page = async ({ params: { observationId } }: PageProps) => {
  const { data: observation } = await createServerSupabaseClient()
    .from('observations')
    .select('description, id, name')
    .eq('id', observationId)
    .single();

  if (!observation) return notFound();

  return (
    <>
      <Header>
        <BackButton href="/observations" />
        <h1 className="text-2xl">Edit observation</h1>
      </Header>
      <Card as="main" breakpoint="sm">
        <ObservationForm observation={observation} />
      </Card>
    </>
  );
};

export default Page;
