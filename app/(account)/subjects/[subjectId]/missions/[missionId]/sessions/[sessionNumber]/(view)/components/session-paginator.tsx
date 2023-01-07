import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import Button from 'components/button';
import Card from 'components/card';
import getLastMissionRoutine from 'utilities/get-last-mission-routine';

interface SessionPaginatorProps {
  missionId: string;
  sessionNumber: number;
  subjectId: string;
}

const SessionPaginator = async ({
  missionId,
  sessionNumber,
  subjectId,
}: SessionPaginatorProps) => {
  const { data: lastRoutine } = await getLastMissionRoutine(missionId);
  const lastSessionNumber = (lastRoutine?.[0]?.session ?? 0) + 1;
  const previousSessionNumber = Math.max(1, sessionNumber - 1);
  const nextSessionNumber = Math.min(lastSessionNumber, sessionNumber + 1);

  return (
    <Card as="nav" className="flex items-center justify-between py-2" size="0">
      <Button
        className="px-9"
        disabled={sessionNumber === 1}
        href={`/subjects/${subjectId}/missions/${missionId}/sessions/${previousSessionNumber}`}
        variant="link"
      >
        <ChevronLeftIcon className="w-6" />
        <span className="sr-only">Previous session</span>
      </Button>
      <span className="text-fg-2">
        Session {sessionNumber} of {lastSessionNumber}
      </span>
      <Button
        className="px-9"
        disabled={sessionNumber === lastSessionNumber}
        href={`/subjects/${subjectId}/missions/${missionId}/sessions/${nextSessionNumber}`}
        variant="link"
      >
        <ChevronRightIcon className="w-6" />
        <span className="sr-only">Next session</span>
      </Button>
    </Card>
  );
};

export default SessionPaginator;
