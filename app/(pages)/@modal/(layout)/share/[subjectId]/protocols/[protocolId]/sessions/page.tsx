import SessionsPage from '@/_components/sessions-page';

interface PageProps {
  params: {
    subjectId: string;
    protocolId: string;
  };
}

const Page = ({ params: { subjectId, protocolId } }: PageProps) => (
  <SessionsPage isPublic subjectId={subjectId} protocolId={protocolId} />
);

export default Page;