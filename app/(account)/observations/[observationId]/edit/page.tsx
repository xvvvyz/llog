import Card from 'components/card';
import { notFound } from 'next/navigation';
import getObservation from 'utilities/get-observation';
import listInputs from 'utilities/list-inputs';
import ObservationTypeForm from '../../components/observation-type-form';

interface PageProps {
  params: {
    observationId: string;
  };
}

const Page = async ({ params: { observationId } }: PageProps) => {
  const { data: observation } = await getObservation(observationId);
  if (!observation) return notFound();
  const { data: availableInputs } = await listInputs();

  return (
    <Card breakpoint="sm">
      <ObservationTypeForm
        availableInputs={availableInputs}
        observation={observation}
      />
    </Card>
  );
};

export default Page;
