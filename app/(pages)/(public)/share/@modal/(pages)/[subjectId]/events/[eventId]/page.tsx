import Button from '@/_components/button';
import EventCard from '@/_components/event-card';
import PageModalHeader from '@/_components/page-modal-header';
import getPublicEvent from '@/_queries/get-public-event';
import getPublicSubject from '@/_queries/get-public-subject';
import formatTitle from '@/_utilities/format-title';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    eventId: string;
    subjectId: string;
  };
  searchParams: {
    back?: string;
  };
}

export const generateMetadata = async ({
  params: { eventId, subjectId },
}: PageProps) => {
  const [{ data: subject }, { data: event }] = await Promise.all([
    getPublicSubject(subjectId),
    getPublicEvent(eventId),
  ]);

  return { title: formatTitle([subject?.name, event?.type?.name]) };
};

const Page = async ({
  params: { eventId, subjectId },
  searchParams: { back },
}: PageProps) => {
  if (!back) notFound();

  const [{ data: subject }, { data: event }] = await Promise.all([
    getPublicSubject(subjectId),
    getPublicEvent(eventId),
  ]);

  if (!subject || !event || !event?.type) notFound();

  return (
    <>
      <PageModalHeader back={back} title={event.type.name as string} />
      <EventCard
        event={event}
        eventType={event.type}
        isPublic
        subjectId={subjectId}
      />
      <Button
        className="m-0 block w-full py-6 text-center"
        href={back}
        scroll={false}
        variant="link"
      >
        Close
      </Button>
    </>
  );
};

export default Page;