'use client';

import Alert from '@/_components/alert';
import Menu from '@/_components/menu';
import useDeleteAlert from '@/_hooks/use-delete-alert';
import useSupabase from '@/_hooks/use-supabase';
import { useRouter } from 'next/navigation';

import {
  DocumentDuplicateIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface InputListItemMenuProps {
  inputId: string;
}

const InputListItemMenu = ({ inputId }: InputListItemMenuProps) => {
  const router = useRouter();
  const supabase = useSupabase();
  const { deleteAlert, isConfirming, startTransition } = useDeleteAlert();

  return (
    <>
      <Alert
        confirmText="Delete input"
        description="Deleting this input does not remove it from existing routines, observations and events."
        isConfirming={isConfirming.value}
        isConfirmingText="Deleting input…"
        onConfirm={async () => {
          isConfirming.setTrue();

          const { error } = await supabase
            .from('inputs')
            .update({ deleted: true })
            .eq('id', inputId);

          if (error) {
            isConfirming.setFalse();
            alert(error.message);
          } else {
            startTransition(router.refresh);
          }
        }}
        {...deleteAlert}
      />
      <Menu className="shrink-0">
        <Menu.Button className="h-full border-l border-alpha-1 bg-alpha-reverse-1 px-4 group-first:rounded-tr group-last:rounded-br">
          <EllipsisVerticalIcon className="w-5" />
        </Menu.Button>
        <Menu.Items>
          <Menu.Item href={`/inputs/create/from-template/${inputId}`}>
            <DocumentDuplicateIcon className="w-5 text-fg-3" />
            Duplicate input
          </Menu.Item>
          <Menu.Item onClick={deleteAlert.setTrue}>
            <TrashIcon className="w-5 text-fg-3" />
            Delete input
          </Menu.Item>
        </Menu.Items>
      </Menu>
    </>
  );
};

export default InputListItemMenu;