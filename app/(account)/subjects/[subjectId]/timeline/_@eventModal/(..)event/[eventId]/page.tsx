import EventCard from '@/(account)/subjects/[subjectId]/_components/event-card';
import getCurrentUser from '@/_server/get-current-user';
import getEvent, { GetEventData } from '@/_server/get-event';
import getSubject from '@/_server/get-subject';
import firstIfArray from '@/_utilities/first-if-array';
import { notFound } from 'next/navigation';
import EventModal from './_components/event-modal';

interface PageProps {
  params: {
    eventId: string;
    subjectId: string;
  };
}

const Page = async ({ params: { eventId, subjectId } }: PageProps) => {
  const [{ data: subject }, { data: event }, user] = await Promise.all([
    getSubject(subjectId),
    getEvent(eventId),
    getCurrentUser(),
  ]);

  if (!subject || !event || !user) notFound();
  const eventType = firstIfArray(event.type);

  return (
    <EventModal
      content={eventType.content}
      subjectId={subjectId}
      title={eventType.name}
    >
      <EventCard
        className="border-0 bg-none"
        event={event as GetEventData}
        eventType={eventType}
        hideContent
        subjectId={subjectId}
        userId={user.id}
      />
    </EventModal>
  );
};

export const revalidate = 0;
export default Page;