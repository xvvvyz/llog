import { LogDeleteForm } from '@/components/log-delete-form';
import { LogEditForm } from '@/components/log-edit-form';
import { LogTagsForm } from '@/components/log-tags-form';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Fragment, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const windowDimensions = useWindowDimensions();

  const snapPoints = useMemo(
    () => [(windowDimensions.height - insets.top - insets.bottom) * 0.5],
    [insets.bottom, insets.top, windowDimensions.height]
  );

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
          enableDynamicSizing={false}
          onClose={() => setTagsFormId(null)}
          portalName="log-tag-form"
          snapPoints={snapPoints}
        >
          <LogTagsForm logId={tagsFormId} />
        </BottomSheet>
      )}
    </Fragment>
  );
};
