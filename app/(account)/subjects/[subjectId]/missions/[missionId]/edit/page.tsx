import Card from 'components/card';
import { notFound } from 'next/navigation';
import getMissionWithRoutines from 'utilities/get-mission-with-routines';
import MissionForm from '../../components/mission-form';

interface PageProps {
  params: {
    missionId: string;
    subjectId: string;
  };
}

const Page = async ({ params: { missionId, subjectId } }: PageProps) => {
  const { data: mission } = await getMissionWithRoutines(missionId);
  if (!mission) return notFound();

  return (
    <Card breakpoint="sm">
      <MissionForm mission={mission} subjectId={subjectId} />
    </Card>
  );
};

export default Page;
