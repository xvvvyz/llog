import BackButton from '@/_components/back-button';
import Breadcrumbs from '@/_components/breadcrumbs';
import EventTypeForm from '@/_components/event-type-form';
import getEventTypeWithInputs from '@/_server/get-event-type-with-inputs';
import getSubject from '@/_server/get-subject';
import listInputs, { ListInputsData } from '@/_server/list-inputs';
import filterListInputsDataBySubjectId from '@/_utilities/filter-list-inputs-data-by-subject-id';
import formatTitle from '@/_utilities/format-title';

import {
  default as listTemplatesWithData,
  ListTemplatesWithDataData,
} from '@/_server/list-templates-with-data';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    eventTypeId: string;
    subjectId: string;
  };
}

export const generateMetadata = async ({
  params: { eventTypeId, subjectId },
}: PageProps) => {
  const [{ data: subject }, { data: eventType }] = await Promise.all([
    getSubject(subjectId),
    getEventTypeWithInputs(eventTypeId),
  ]);

  return { title: formatTitle([subject?.name, eventType?.name, 'Edit']) };
};

export const revalidate = 0;

const Page = async ({ params: { eventTypeId, subjectId } }: PageProps) => {
  const [
    { data: subject },
    { data: eventType },
    { data: availableInputs },
    { data: availableTemplates },
  ] = await Promise.all([
    getSubject(subjectId),
    getEventTypeWithInputs(eventTypeId),
    listInputs(),
    listTemplatesWithData(),
  ]);

  if (!subject || !eventType?.name) notFound();

  return (
    <>
      <div className="my-16 flex h-8 items-center justify-between gap-8 px-4">
        <BackButton href={`/subjects/${subjectId}`} />
        <Breadcrumbs
          items={[[subject.name, `/subjects/${subjectId}`], [eventType.name]]}
        />
      </div>
      <EventTypeForm
        availableInputs={filterListInputsDataBySubjectId(
          availableInputs as ListInputsData,
          subjectId,
        )}
        availableTemplates={availableTemplates as ListTemplatesWithDataData}
        eventType={eventType}
        subjectId={subjectId}
      />
    </>
  );
};

export default Page;