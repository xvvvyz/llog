import InputForm from '@/_components/input-form';
import * as Modal from '@/_components/modal';
import PageModalHeader from '@/_components/page-modal-header';
import listSubjectsByTeamId from '@/_queries/list-subjects-by-team-id';
import formatTitle from '@/_utilities/format-title';

export const metadata = { title: formatTitle(['Inputs', 'New']) };

const Page = async () => {
  const { data: subjects } = await listSubjectsByTeamId();
  if (!subjects) return null;

  return (
    <Modal.Content>
      <PageModalHeader title="New input" />
      <InputForm subjects={subjects} />
    </Modal.Content>
  );
};

export default Page;