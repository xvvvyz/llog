import Events from '@/_components/events';
import getCurrentUserFromSession from '@/_queries/get-current-user-from-session';
import getPublicSubject from '@/_queries/get-public-subject';
import getSubject from '@/_queries/get-subject';
import add24Hours from '@/_utilities/add-24-hours';
import parseShortIso from '@/_utilities/parse-short-iso';

interface SubjectPageProps {
  from?: string;
  limit?: string;
  isPublic?: boolean;
  subjectId: string;
  to?: string;
}

const SubjectEventsPage = async ({
  from,
  limit,
  isPublic,
  subjectId,
  to,
}: SubjectPageProps) => {
  const user = await getCurrentUserFromSession();

  const { data: subject } = isPublic
    ? await getPublicSubject(subjectId)
    : await getSubject(subjectId);

  if (!subject) return null;
  const isTeamMember = subject.team_id === user?.id;

  return (
    <Events
      filters={{
        endDate: add24Hours(parseShortIso(to ?? from)),
        from: 0,
        pageSize: 25,
        startDate: parseShortIso(from),
        to: limit ? Number(limit) : 24,
      }}
      isPublic={isPublic}
      isTeamMember={isTeamMember}
      subjectId={subjectId}
      user={user}
    />
  );
};

export default SubjectEventsPage;