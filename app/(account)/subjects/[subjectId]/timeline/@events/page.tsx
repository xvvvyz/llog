import Empty from '@/_components/empty';
import Header from '@/_components/header';
import getCurrentUser from '@/_server/get-current-user';
import listEvents, { ListEventsData } from '@/_server/list-events';
import DownloadEventsButton from './_components/download-events-button';
import TimelineEvents from './_components/timeline-events';

interface PageProps {
  params: {
    subjectId: string;
  };
}

const Page = async ({ params: { subjectId } }: PageProps) => {
  const [{ data: events }, user] = await Promise.all([
    listEvents(subjectId),
    getCurrentUser(),
  ]);

  if (!events?.length || !user) return <Empty>No events</Empty>;

  return (
    <div className="mt-16">
      <Header className="mb-2">
        <h1 className="text-2xl">Timeline</h1>
        <DownloadEventsButton subjectId={subjectId} />
      </Header>
      <TimelineEvents
        events={events as ListEventsData}
        subjectId={subjectId}
        userId={user.id}
      />
    </div>
  );
};

export const revalidate = 0;
export default Page;