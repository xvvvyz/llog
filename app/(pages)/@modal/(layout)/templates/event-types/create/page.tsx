import EventTypeTemplateForm from '@/_components/event-type-template-form';
import * as Modal from '@/_components/modal';
import PageModalHeader from '@/_components/page-modal-header';
import listInputs from '@/_queries/list-inputs';
import listSubjectsByTeamId from '@/_queries/list-subjects-by-team-id';

const Page = async () => {
  const [{ data: availableInputs }, { data: subjects }] = await Promise.all([
    listInputs(),
    listSubjectsByTeamId(),
  ]);

  if (!availableInputs || !subjects) return null;

  return (
    <Modal.Content>
      <PageModalHeader title="New event type template" />
      <EventTypeTemplateForm
        availableInputs={availableInputs}
        subjects={subjects}
      />
    </Modal.Content>
  );
};

export default Page;