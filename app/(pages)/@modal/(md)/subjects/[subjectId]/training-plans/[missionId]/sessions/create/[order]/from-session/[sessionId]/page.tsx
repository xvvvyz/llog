import BackButton from '@/_components/back-button';
import SessionForm from '@/_components/session-form';
import getCurrentUser from '@/_queries/get-current-user';
import getSession from '@/_queries/get-session';
import getSubject from '@/_queries/get-subject';
import getTrainingPlanWithSessions from '@/_queries/get-training-plan-with-sessions';
import listInputsBySubjectId from '@/_queries/list-inputs-by-subject-id';
import listSubjectsByTeamId from '@/_queries/list-subjects-by-team-id';
import listTemplatesWithData from '@/_queries/list-templates-with-data';
import formatTitle from '@/_utilities/format-title';

interface PageProps {
  params: {
    missionId: string;
    order: string;
    sessionId: string;
    subjectId: string;
  };
}

export const metadata = {
  title: formatTitle(['Subjects', 'Training plans', 'Sessions', 'New']),
};

const Page = async ({
  params: { missionId, order, sessionId, subjectId },
}: PageProps) => {
  const [
    { data: subject },
    { data: mission },
    { data: session },
    { data: availableInputs },
    { data: availableTemplates },
    { data: subjects },
    user,
  ] = await Promise.all([
    getSubject(subjectId),
    getTrainingPlanWithSessions(missionId, { draft: true }),
    getSession(sessionId),
    listInputsBySubjectId(subjectId),
    listTemplatesWithData(),
    listSubjectsByTeamId(),
    getCurrentUser(),
  ]);

  if (
    !subject ||
    !mission ||
    !session ||
    !availableInputs ||
    !availableTemplates ||
    !subjects ||
    !user ||
    subject.team_id !== user.id
  ) {
    return null;
  }

  return (
    <>
      <SessionForm
        availableInputs={availableInputs}
        availableTemplates={availableTemplates}
        isDuplicate
        mission={mission}
        order={order}
        session={session}
        subjects={subjects}
        subjectId={subjectId}
      />
      <BackButton className="m-0 block w-full py-6 text-center" variant="link">
        Close
      </BackButton>
    </>
  );
};

export default Page;
