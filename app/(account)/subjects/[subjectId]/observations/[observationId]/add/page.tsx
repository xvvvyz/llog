import Card from 'components/card';
import { notFound } from 'next/navigation';
import createServerSupabaseClient from 'utilities/create-server-supabase-client';
import ObservationForm from '../components/observation-form';

interface PageProps {
  params: {
    observationId: string;
    subjectId: string;
  };
}

const Page = async ({ params: { observationId, subjectId } }: PageProps) => {
  const { data: observation } = await createServerSupabaseClient()
    .from('observations')
    .select('inputs(label, options:input_options(label), type)')
    .eq('id', observationId)
    .single();

  if (!observation) return notFound();

  return (
    <Card breakpoint="sm">
      <ObservationForm observationId={observationId} subjectId={subjectId} />
    </Card>
  );
};

export default Page;
