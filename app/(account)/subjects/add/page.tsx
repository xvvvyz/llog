import SubjectForm from '(account)/subjects/components/subject-form';
import BackButton from 'components/back-button';
import Card from 'components/card';
import Header from 'components/header';
import createServerSupabaseClient from 'utilities/create-server-supabase-client';

const Page = async () => {
  const { data: availableObservations } = await createServerSupabaseClient()
    .from('observations')
    .select('id, name');

  return (
    <>
      <Header>
        <BackButton href="/subjects" />
        <h1 className="text-2xl">Add subject</h1>
      </Header>
      <Card as="main" breakpoint="sm">
        <SubjectForm availableObservations={availableObservations} />
      </Card>
    </>
  );
};

export default Page;
