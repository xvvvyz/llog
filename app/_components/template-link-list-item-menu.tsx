'use client';

import Alert from '@/_components/alert';
import Menu from '@/_components/menu';
import deleteTemplate from '@/_mutations/delete-template';
import EllipsisVerticalIcon from '@heroicons/react/24/outline/EllipsisVerticalIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import { useToggle } from '@uidotdev/usehooks';

interface TemplateLinkListItemMenuItemsProps {
  templateId: string;
}

const TemplateLinkListItemMenu = ({
  templateId,
}: TemplateLinkListItemMenuItemsProps) => {
  const [deleteAlert, toggleDeleteAlert] = useToggle(false);

  return (
    <>
      <Alert
        confirmText="Delete template"
        isConfirmingText="Deleting…"
        isOpen={deleteAlert}
        onClose={toggleDeleteAlert}
        onConfirm={() => deleteTemplate(templateId)}
      />
      <Menu className="shrink-0">
        <Menu.Button className="group flex h-full items-center justify-center px-2 text-fg-3 hover:text-fg-2">
          <div className="rounded-full p-2 group-hover:bg-alpha-1">
            <EllipsisVerticalIcon className="w-5" />
          </div>
        </Menu.Button>
        <Menu.Items className="mr-2 mt-2">
          <Menu.Item onClick={() => toggleDeleteAlert(true)}>
            <TrashIcon className="w-5 text-fg-4" />
            Delete
          </Menu.Item>
        </Menu.Items>
      </Menu>
    </>
  );
};

export default TemplateLinkListItemMenu;
