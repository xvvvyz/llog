import InsightForm from '@/_components/insight-form';
import * as Modal from '@/_components/modal';
import PageModalHeader from '@/_components/page-modal-header';
import Number from '@/_constants/enum-number';
import listEvents from '@/_queries/list-events';

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { subjectId } = await params;

  const { data: events } = await listEvents(subjectId, {
    from: 0,
    to: Number.FourByteSignedIntMax - 1,
  });

  if (!events) return false;

  return (
    <Modal.Content className="max-w-3xl">
      <PageModalHeader title="New insight" />
      <InsightForm events={events} subjectId={subjectId} />
    </Modal.Content>
  );
};

export default Page;
