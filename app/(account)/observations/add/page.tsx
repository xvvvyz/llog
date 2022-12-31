import Card from 'components/card';
import BackButton from '../../../components/back-button';
import Header from '../../../components/header';
import ObservationTypeForm from '../components/observation-type-form';

const Page = () => (
  <>
    <Header>
      <BackButton href="/observations" />
      <h1 className="text-2xl">Add observation type</h1>
    </Header>
    <Card as="main" breakpoint="sm">
      <ObservationTypeForm />
    </Card>
  </>
);

export default Page;
