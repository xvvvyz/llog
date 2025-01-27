import Avatar from '@/_components/avatar';
import Button from '@/_components/button';
import EventCard from '@/_components/event-card';
import EventMenu from '@/_components/event-menu';
import * as Modal from '@/_components/modal';
import PageModalHeader from '@/_components/page-modal-header';
import getCurrentUser from '@/_queries/get-current-user';
import getEvent from '@/_queries/get-event';
import getPublicEvent from '@/_queries/get-public-event';
import getPublicSubject from '@/_queries/get-public-subject';
import getSubject from '@/_queries/get-subject';
import ArrowUpRightIcon from '@heroicons/react/24/outline/ArrowUpRightIcon';

interface EventPageProps {
  eventId: string;
  isPublic?: boolean;
  subjectId: string;
}

const EventPage = async ({ eventId, isPublic, subjectId }: EventPageProps) => {
  const [{ data: subject }, { data: event }, user] = await Promise.all([
    isPublic ? getPublicSubject(subjectId) : getSubject(subjectId),
    isPublic ? getPublicEvent(eventId) : getEvent(eventId),
    getCurrentUser(),
  ]);

  if (!subject || !event || !event.type) return null;

  const isTeamMember =
    !!user && subject.team_id === user.app_metadata.active_team_id;

  const shareOrSubjects = isPublic ? 'share' : 'subjects';

  return (
    <Modal.Content>
      <PageModalHeader
        right={isTeamMember && <EventMenu eventId={eventId} isModal />}
        subtitle={
          <>
            {event && (
              <div className="smallcaps flex items-center gap-2 pt-2 text-fg-4">
                <div className="shrink-0">
                  {event.type.session ? 'Completed' : 'Recorded'} by
                </div>
                <Avatar
                  className="-my-[0.15rem] size-5"
                  file={event.profile?.image_uri}
                  id={event.profile?.id}
                />
                <div className="truncate">
                  {event.profile?.first_name} {event.profile?.last_name}
                </div>
              </div>
            )}
            {event.type.session && (
              <Button
                className="pt-4"
                href={`/${shareOrSubjects}/${subjectId}/protocols/${event.type.session.protocol?.id}/sessions/${event.type.session.id}`}
                variant="link"
              >
                View full session
                <ArrowUpRightIcon className="w-5" />
              </Button>
            )}
          </>
        }
        title={
          event.type.session
            ? `Module ${Number(event.type.order) + 1}${event.type.name ? `: ${event.type.name}` : ''}`
            : event.type.name
        }
      />
      <EventCard
        event={event}
        eventType={event.type}
        isArchived={subject.archived}
        isPublic={isPublic}
        isTeamMember={isTeamMember}
        subjectId={subjectId}
        user={user}
      />
      <Modal.Close asChild>
        <Button className="m-0 block w-full py-6 text-center" variant="link">
          Close
        </Button>
      </Modal.Close>
    </Modal.Content>
  );
};

export default EventPage;
