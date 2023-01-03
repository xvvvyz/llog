import Button from 'components/button';
import Card from 'components/card';
import Empty from 'components/empty';
import firstIfArray from 'utilities/first-if-array';
import sanitizeHtml from 'utilities/sanitize-html';
import RoutineForm from './components/routine-form';
import getSessionRoutines from './utilities/get-session-routines';

interface PageProps {
  params: {
    missionId: string;
    sessionNumber: string;
    subjectId: string;
  };
}

const Page = async ({
  params: { missionId, sessionNumber, subjectId },
}: PageProps) => {
  const { data: routines } = await getSessionRoutines(missionId, sessionNumber);

  if (!routines?.length) {
    return (
      <Empty>
        No routines
        <Button
          className="underline"
          href={`/subjects/${subjectId}/missions/${missionId}/edit?back=/subjects/${subjectId}/missions/${missionId}/sessions/${sessionNumber}`}
          variant="link"
        >
          Edit mission
        </Button>
      </Empty>
    );
  }

  return routines.map((routine) => (
    <Card
      as="section"
      breakpoint="sm"
      className="mt-16 sm:mt-3"
      key={routine.id}
    >
      <h2 className="text-2xl">{routine.name}</h2>
      <article
        className="prose mt-9 flex flex-col gap-3"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(routine.content) }}
      />
      <RoutineForm
        eventId={firstIfArray(routine.event)?.id}
        routineId={routine.id}
        subjectId={subjectId}
      />
    </Card>
  ));
};

export default Page;
