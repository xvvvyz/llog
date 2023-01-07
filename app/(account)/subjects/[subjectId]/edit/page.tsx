import SubjectForm from '(account)/subjects/components/subject-form';
import Card from 'components/card';
import { notFound } from 'next/navigation';
import getSubjectWithObservations from 'utilities/get-subject-with-observations';
import listObservations from 'utilities/list-observations';

interface PageProps {
  params: {
    subjectId: string;
  };
}

const Page = async ({ params: { subjectId } }: PageProps) => {
  const { data: subject } = await getSubjectWithObservations(subjectId);
  if (!subject) return notFound();
  const { data: availableObservations } = await listObservations();

  return (
    <Card breakpoint="sm">
      <SubjectForm
        availableObservations={availableObservations}
        subject={subject}
      />
    </Card>
  );
};

export default Page;
