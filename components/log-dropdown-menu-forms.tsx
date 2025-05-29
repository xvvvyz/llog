import { LogDeleteForm } from '@/components/log-delete-form';
import { LogEditForm } from '@/components/log-edit-form';
import { LogTagsForm } from '@/components/log-tags-form';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Fragment } from 'react';

export const LogDropdownMenuForms = ({
  deleteFormId,
  editFormId,
  setDeleteFormId,
  setEditFormId,
  setTagsFormId,
  tagsFormId,
}: {
  deleteFormId: string | null;
  editFormId: string | null;
  setDeleteFormId: (id: string | null) => void;
  setEditFormId: (id: string | null) => void;
  setTagsFormId: (id: string | null) => void;
  tagsFormId: string | null;
}) => {
  return (
    <Fragment>
      {deleteFormId && (
        <BottomSheet
          onClose={() => setDeleteFormId(null)}
          portalName="delete-log-form"
        >
          <LogDeleteForm logId={deleteFormId} />
        </BottomSheet>
      )}
      {editFormId && (
        <BottomSheet
          onClose={() => setEditFormId(null)}
          portalName="log-edit-form"
        >
          <LogEditForm logId={editFormId} />
        </BottomSheet>
      )}
      {tagsFormId && (
        <BottomSheet
          onClose={() => setTagsFormId(null)}
          portalName="log-tag-form"
        >
          <LogTagsForm logId={tagsFormId} />
        </BottomSheet>
      )}
    </Fragment>
  );
};
