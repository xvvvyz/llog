import MissionForm from '(account)/subjects/[subjectId]/missions/components/mission-form';
import BackButton from 'components/back-button';
import Card from 'components/card';
import Header from 'components/header';

interface PageProps {
  params: {
    subjectId: string;
  };
}

const Page = ({ params: { subjectId } }: PageProps) => (
  <>
    <Header>
      <BackButton />
      <h1 className="text-2xl">Add mission</h1>
    </Header>
    <Card as="main" breakpoint="sm">
      <MissionForm subjectId={subjectId} />
    </Card>
  </>
);

export default Page;
