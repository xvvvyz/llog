import * as Modal from '@/_components/modal';
import ModuleTemplateForm from '@/_components/module-template-form';
import PageModalHeader from '@/_components/page-modal-header';
import getTemplate from '@/_queries/get-template';
import listInputs from '@/_queries/list-inputs';
import listSubjectsByTeamId from '@/_queries/list-subjects-by-team-id';

interface PageProps {
  params: {
    templateId: string;
  };
}

const Page = async ({ params: { templateId } }: PageProps) => {
  const [{ data: template }, { data: availableInputs }, { data: subjects }] =
    await Promise.all([
      getTemplate(templateId),
      listInputs(),
      listSubjectsByTeamId(),
    ]);

  if (!template || !availableInputs || !subjects) return null;

  return (
    <Modal.Content>
      <PageModalHeader title="Edit module template" />
      <ModuleTemplateForm
        availableInputs={availableInputs}
        subjects={subjects}
        template={template}
      />
    </Modal.Content>
  );
};

export default Page;