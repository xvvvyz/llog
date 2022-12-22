import BackButton from 'components/back-button';
import Card from 'components/card';
import Header from 'components/header';
import ObservationForm from '../components/observation-form';

const Page = () => (
  <>
    <Header>
      <BackButton />
      <h1 className="text-2xl">Add observation type</h1>
    </Header>
    <Card as="main" breakpoint="sm">
      <ObservationForm />
    </Card>
  </>
);

export default Page;
