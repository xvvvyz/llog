import BackButton from 'components/back-button';
import Card from 'components/card';
import Header from 'components/header';
import listInputs from 'utilities/list-inputs';
import ObservationTypeForm from '../components/observation-type-form';

const Page = async () => {
  const { data: availableInputs } = await listInputs();

  return (
    <>
      <Header>
        <BackButton href="/observations" />
        <h1 className="text-2xl">Add observation type</h1>
      </Header>
      <Card as="main" breakpoint="sm">
        <ObservationTypeForm availableInputs={availableInputs} />
      </Card>
    </>
  );
};

export default Page;
