import MissionForm from '(account)/subjects/[subjectId]/missions/components/mission-form';
import Card from 'components/card';

interface PageProps {
  params: {
    subjectId: string;
  };
}

const Page = ({ params: { subjectId } }: PageProps) => (
  <Card breakpoint="sm">
    <MissionForm subjectId={subjectId} />
  </Card>
);

export default Page;
