import Card from 'components/card';
import { notFound } from 'next/navigation';
import createServerSupabaseClient from 'utilities/create-server-supabase-client';
import ObservationTypeForm from '../../components/observation-type-form';

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
    <Card breakpoint="sm">
      <ObservationTypeForm observation={observation} />
    </Card>
  );
};

export default Page;