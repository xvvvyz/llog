import getMissionWithSessions from '@/(account)/_server/get-mission-with-sessions';
import getSession, { GetSessionData } from '@/(account)/_server/get-session';
import getSubject from '@/(account)/_server/get-subject';
import listInputs, { ListInputsData } from '@/(account)/_server/list-inputs';
import filterListInputsDataBySubjectId from '@/(account)/_utilities/filter-list-inputs-data-by-subject-id';
import formatTitle from '@/(account)/_utilities/format-title';
import SessionForm from '@/(account)/subjects/[subjectId]/missions/[missionId]/sessions/_components/session-form';
import { notFound } from 'next/navigation';

import listTemplatesWithData, {
  ListTemplatesWithDataData,
} from '@/(account)/_server/list-templates-with-data';

export const generateMetadata = async ({
  params: { missionId, subjectId },
}: PageProps) => {
  const [{ data: subject }, { data: mission }] = await Promise.all([
    getSubject(subjectId),
    getMissionWithSessions(missionId, true),
  ]);

  return {
    title: formatTitle([subject?.name, mission?.name, 'Create session']),
  };
};

export const revalidate = 0;

interface PageProps {
  params: {
    missionId: string;
    sessionId: string;
    subjectId: string;
  };
}

const Page = async ({
  params: { missionId, sessionId, subjectId },
}: PageProps) => {
  const [
    { data: subject },
    { data: mission },
    { data: session },
    { data: availableInputs },
    { data: availableTemplates },
  ] = await Promise.all([
    getSubject(subjectId),
    getMissionWithSessions(missionId, true),
    getSession(sessionId),
    listInputs(),
    listTemplatesWithData(),
  ]);

  if (!subject || !mission || !session) notFound();

  return (
    <SessionForm
      availableInputs={filterListInputsDataBySubjectId(
        availableInputs as ListInputsData,
        subjectId
      )}
      availableTemplates={availableTemplates as ListTemplatesWithDataData}
      mission={mission}
      session={session as GetSessionData}
      subjectId={subjectId}
    />
  );
};

export default Page;