import Button from '@/_components/button';
import Empty from '@/_components/empty';
import Insights from '@/_components/insights';
import Number from '@/_constants/enum-number';
import getCurrentUser from '@/_queries/get-current-user';
import getPublicSubject from '@/_queries/get-public-subject';
import getSubject from '@/_queries/get-subject';
import listEvents from '@/_queries/list-events';
import listInsights from '@/_queries/list-insights';
import listPublicEvents from '@/_queries/list-public-events';
import listPublicInsights from '@/_queries/list-public-insights';
import formatEventFilters from '@/_utilities/format-event-filters';
import InformationCircleIcon from '@heroicons/react/24/outline/InformationCircleIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import { URLSearchParams } from 'next/dist/compiled/@edge-runtime/primitives';

interface SubjectInsightsPageProps {
  isPublic?: boolean;
  searchParams: { from?: string; to?: string };
  subjectId: string;
}

const SubjectInsightsPage = async ({
  isPublic,
  searchParams,
  subjectId,
}: SubjectInsightsPageProps) => {
  const f = formatEventFilters({
    from: searchParams.from,
    limit: String(Number.FourByteSignedIntMax - 1),
    to: searchParams.to,
  });

  const [{ data: subject }, { data: events }, { data: insights }, user] =
    await Promise.all([
      isPublic ? getPublicSubject(subjectId) : getSubject(subjectId),
      isPublic ? listPublicEvents(subjectId, f) : listEvents(subjectId, f),
      isPublic ? listPublicInsights(subjectId) : listInsights(subjectId),
      getCurrentUser(),
    ]);

  if (!subject || !events) return null;
  const isTeamMember = !!user && subject.team_id === user.id;
  const shareOrSubjects = isPublic ? 'share' : 'subjects';
  const searchObject = new URLSearchParams(searchParams);
  const searchString = searchObject.size ? `?${searchObject.toString()}` : '';

  return (
    <div className="mt-16 space-y-4">
      {isTeamMember && !subject.archived && (
        <Button
          className="w-full"
          colorScheme="transparent"
          href={`/subjects/${subjectId}/insights/create`}
          scroll={false}
        >
          <PlusIcon className="w-5" />
          Create insight
        </Button>
      )}
      {!insights?.length ? (
        <Empty className="mt-4">
          <InformationCircleIcon className="w-7" />
          No insights.
        </Empty>
      ) : (
        <Insights
          events={events}
          insights={insights}
          isArchived={subject.archived}
          isPublic={isPublic}
          isTeamMember={isTeamMember}
          searchString={searchString}
          shareOrSubjects={shareOrSubjects}
          subjectId={subjectId}
        />
      )}
    </div>
  );
};

export default SubjectInsightsPage;
