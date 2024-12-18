import EventCard from '@/_components/event-card';
import EventTypeMenu from '@/_components/event-type-menu';
import * as Modal from '@/_components/modal';
import PageModalHeader from '@/_components/page-modal-header';
import getCurrentUser from '@/_queries/get-current-user';
import getEventTypeWithInputsAndOptions from '@/_queries/get-event-type-with-inputs-and-options';
import getSubject from '@/_queries/get-subject';

interface PageProps {
  params: Promise<{ eventTypeId: string; subjectId: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { eventTypeId, subjectId } = await params;

  const [{ data: subject }, { data: eventType }, user] = await Promise.all([
    getSubject(subjectId),
    getEventTypeWithInputsAndOptions(eventTypeId),
    getCurrentUser(),
  ]);

  if (!subject || !eventType) return null;

  const isTeamMember =
    !!user && subject.team_id === user.app_metadata.active_team_id;

  return (
    <Modal.Content>
      <PageModalHeader
        right={
          isTeamMember && (
            <EventTypeMenu
              eventTypeId={eventType.id}
              isModal
              subjectId={subjectId}
            />
          )
        }
        title={eventType.name as string}
      />
      <EventCard
        eventType={eventType}
        isArchived={subject.archived}
        isTeamMember={isTeamMember}
        subjectId={subjectId}
        user={user}
      />
    </Modal.Content>
  );
};

export default Page;
