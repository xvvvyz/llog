import BackButton from '(components)/back-button';
import Breadcrumbs from '(components)/breadcrumbs';
import Card from '(components)/card';
import Header from '(components)/header';
import formatTitle from '(utilities)/format-title';
import getTemplate from '(utilities)/get-template';
import listInputs from '(utilities)/list-inputs';
import { notFound } from 'next/navigation';
import TemplateForm from '../../(components)/template-form';

interface PageProps {
  params: {
    templateId: string;
  };
}

const Page = async ({ params: { templateId } }: PageProps) => {
  const [{ data: template }, { data: availableInputs }] = await Promise.all([
    getTemplate(templateId),
    listInputs(),
  ]);

  if (!template) return notFound();

  return (
    <>
      <Header>
        <BackButton href="/templates" />
        <Breadcrumbs items={[['Templates', '/templates'], [template.name]]} />
      </Header>
      <Card as="main" breakpoint="sm">
        <TemplateForm availableInputs={availableInputs} template={template} />
      </Card>
    </>
  );
};

export const dynamic = 'force-dynamic';

export const generateMetadata = async ({
  params: { templateId },
}: PageProps) => {
  const { data: template } = await getTemplate(templateId);
  if (!template) return;
  return { title: formatTitle(['Templates', template.name]) };
};

export default Page;