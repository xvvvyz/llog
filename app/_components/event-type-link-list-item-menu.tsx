'use client';

import Alert from '@/_components/alert';
import Menu from '@/_components/menu';
import MenuButton from '@/_components/menu-button';
import MenuItem from '@/_components/menu-item';
import MenuItems from '@/_components/menu-items';
import useDeleteAlert from '@/_hooks/use-delete-alert';
import useSupabase from '@/_hooks/use-supabase';
import { useRouter } from 'next/navigation';

import {
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface EventTypeLinkListItemMenuProps {
  eventTypeId: string;
  subjectId: string;
}

const EventTypeLinkListItemMenu = ({
  eventTypeId,
  subjectId,
}: EventTypeLinkListItemMenuProps) => {
  const router = useRouter();
  const supabase = useSupabase();

  const {
    deleteAlert,
    isConfirming,
    startTransition,
    toggleDeleteAlert,
    toggleIsConfirming,
  } = useDeleteAlert();

  return (
    <>
      <Alert
        confirmText="Delete event type"
        isConfirming={isConfirming}
        isConfirmingText="Deleting event type…"
        isOpen={deleteAlert}
        onClose={toggleDeleteAlert}
        onConfirm={async () => {
          toggleIsConfirming(true);

          const { error } = await supabase
            .from('event_types')
            .delete()
            .eq('id', eventTypeId);

          if (error) {
            toggleIsConfirming(false);
            alert(error.message);
          } else {
            startTransition(router.refresh);
          }
        }}
      />
      <Menu className="shrink-0">
        <MenuButton className="group flex h-full items-center justify-center px-2 text-fg-3 hover:text-fg-2">
          <div className="rounded-full p-2 group-hover:bg-alpha-1">
            <EllipsisVerticalIcon className="w-5" />
          </div>
        </MenuButton>
        <MenuItems className="mr-2 mt-2">
          <MenuItem
            href={`/subjects/${subjectId}/event-types/${eventTypeId}/edit`}
          >
            <PencilIcon className="w-5 text-fg-4" />
            Edit event type
          </MenuItem>
          <MenuItem onClick={() => toggleDeleteAlert(true)}>
            <TrashIcon className="w-5 text-fg-4" />
            Delete event type
          </MenuItem>
        </MenuItems>
      </Menu>
    </>
  );
};

export default EventTypeLinkListItemMenu;