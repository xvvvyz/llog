import Card from 'components/card';
// import createServerSupabaseClient from 'utilities/create-server-supabase-client';
import ObservationForm from '../components/observation-form';

interface PageProps {
  params: {
    observationId: string;
    subjectId: string;
  };
}

const Page = async ({ params: { observationId, subjectId } }: PageProps) => {
  // const { data: inputs } = await createServerSupabaseClient()
  //   .from('observation_inputs')
  //   .select('input:inputs(label, options:input_options(label), type)')
  //   .eq('observation_id', observationId);

  return (
    <Card breakpoint="sm">
      <ObservationForm observationId={observationId} subjectId={subjectId} />
    </Card>
  );
};

export default Page;
