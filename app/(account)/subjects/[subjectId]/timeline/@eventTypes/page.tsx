import EventTypeList from '@/(account)/subjects/[subjectId]/timeline/@eventTypes/_components/event-type-list';
import EventTypes from '@/_constants/enum-event-types';
import getCurrentTeamId from '@/_server/get-current-team-id';
import getSubject from '@/_server/get-subject';
import forceArray from '@/_utilities/force-array';

import listSubjectEventTypes, {
  ListSubjectEventTypesData,
} from '@/_server/list-subject-event-types';

interface PageProps {
  params: {
    subjectId: string;
  };
}

const Page = async ({ params: { subjectId } }: PageProps) => {
  const { data: subject } = await getSubject(subjectId);
  if (!subject) return null;
  const currentTeamId = await getCurrentTeamId();
  const isTeamMember = subject.team_id === currentTeamId;
  const { data: eventTypes } = await listSubjectEventTypes(subjectId);

  const { observations, routines } = forceArray(eventTypes).reduce(
    (
      acc: {
        observations: NonNullable<ListSubjectEventTypesData>;
        routines: NonNullable<ListSubjectEventTypesData>;
      },
      eventType
    ) => {
      switch (eventType.type) {
        case EventTypes.Observation: {
          acc.observations.push(eventType);
          break;
        }

        case EventTypes.Routine: {
          acc.routines.push(eventType);
          break;
        }

        default: {
          // noop
        }
      }

      return acc;
    },
    { observations: [], routines: [] }
  );

  return (
    <>
      <EventTypeList
        eventTypes={routines}
        isTeamMember={isTeamMember}
        subjectId={subjectId}
      />
      <EventTypeList
        eventTypes={observations}
        isTeamMember={isTeamMember}
        subjectId={subjectId}
      />
    </>
  );
};

export const revalidate = 0;
export default Page;