import EventTypeForm from '@/_components/event-type-form';
import TemplateType from '@/_constants/enum-template-type';
import getEventTypeWithInputs from '@/_queries/get-event-type-with-inputs';
import getSubject from '@/_queries/get-subject';
import listInputsBySubjectId from '@/_queries/list-inputs-by-subject-id';
import listSubjectsByTeamId from '@/_queries/list-subjects-by-team-id';
import listTemplatesBySubjectIdAndType from '@/_queries/list-templates-by-subject-id-and-type';

interface PageProps {
  params: Promise<{ eventTypeId: string; subjectId: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { eventTypeId, subjectId } = await params;

  const [
    { data: availableEventTypeTemplates },
    { data: availableInputs },
    { data: eventType },
    { data: subject },
    { data: subjects },
  ] = await Promise.all([
    listTemplatesBySubjectIdAndType({
      subjectId,
      type: TemplateType.EventType,
    }),
    listInputsBySubjectId(subjectId),
    getEventTypeWithInputs(eventTypeId),
    getSubject(subjectId),
    listSubjectsByTeamId(),
  ]);

  if (
    !availableEventTypeTemplates ||
    !availableInputs ||
    !eventType ||
    !subject ||
    !subjects
  ) {
    return null;
  }

  return (
    <EventTypeForm
      availableEventTypeTemplates={availableEventTypeTemplates}
      availableInputs={availableInputs}
      eventType={eventType}
      subjectId={subjectId}
      subjects={subjects}
    />
  );
};

export default Page;
