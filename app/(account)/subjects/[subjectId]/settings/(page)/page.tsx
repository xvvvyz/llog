import BackButton from '(components)/back-button';
import Breadcrumbs from '(components)/breadcrumbs';
import Card from '(components)/card';
import Header from '(components)/header';
import formatTitle from '(utilities)/format-title';
import getSubjectWithEventTypesAndMissions from '(utilities)/get-subject-with-event-types-and-missions';
import listTemplates from '(utilities)/list-templates';
import { notFound } from 'next/navigation';
import SubjectSettingsForm from './(components)/subject-settings-form';

interface PageProps {
  params: {
    subjectId: string;
  };
}

const Page = async ({ params: { subjectId } }: PageProps) => {
  const [{ data: subject }, { data: availableTemplates }] = await Promise.all([
    getSubjectWithEventTypesAndMissions(subjectId),
    listTemplates(),
  ]);

  if (!subject) return notFound();
  const subjectHref = `/subjects/${subject.id}`;

  return (
    <>
      <Header>
        <BackButton href={subjectHref} />
        <Breadcrumbs items={[[subject.name, subjectHref], ['Settings']]} />
      </Header>
      <Card as="main" breakpoint="sm">
        <SubjectSettingsForm
          availableTemplates={availableTemplates}
          subject={subject}
        />
      </Card>
    </>
  );
};

export const dynamic = 'force-dynamic';

export const generateMetadata = async ({
  params: { subjectId },
}: PageProps) => {
  const { data: subject } = await getSubjectWithEventTypesAndMissions(
    subjectId
  );

  if (!subject) return;
  return { title: formatTitle([subject.name, 'Settings']) };
};

export default Page;