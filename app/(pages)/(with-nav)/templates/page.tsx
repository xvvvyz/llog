import Button from '@/_components/button';
import Empty from '@/_components/empty';
import TemplateMenu from '@/_components/template-menu';
import listTemplates from '@/_queries/list-templates';
import InformationCircleIcon from '@heroicons/react/24/outline/ExclamationCircleIcon';

export const metadata = { title: 'Templates' };

const Page = async () => {
  const { data: templates } = await listTemplates();

  if (!templates?.length) {
    return (
      <Empty className="mx-4">
        <InformationCircleIcon className="w-7" />
        Templates define reusable content for
        <br />
        event types and session modules.
      </Empty>
    );
  }

  return (
    <ul className="mx-4 overflow-hidden rounded border border-alpha-1 bg-bg-2 py-1">
      {templates.map((template) => (
        <li
          className="flex items-stretch hover:bg-alpha-1 active:bg-alpha-1"
          key={template.id}
        >
          <Button
            className="m-0 w-full px-4 py-3 pr-0 leading-snug"
            href={`/templates/${template.id}`}
            scroll={false}
            variant="link"
          >
            {template.name}
          </Button>
          <TemplateMenu templateId={template.id} />
        </li>
      ))}
    </ul>
  );
};

export default Page;
