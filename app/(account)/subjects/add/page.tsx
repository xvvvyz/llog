import SubjectForm from '../../../../components/subject-form';
import BackButton from '/components/back-button';
import Card from '/components/card';
import Header from '/components/header';

const Page = () => (
  <>
    <Header>
      <BackButton />
      <h1 className="text-2xl font-bold">Add subject</h1>
    </Header>
    <Card as="main" breakpoint="sm">
      <SubjectForm />
    </Card>
  </>
);

export default Page;
