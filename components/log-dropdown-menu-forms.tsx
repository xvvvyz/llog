import { LogDeleteForm } from '@/components/log-delete-form';
import { LogEditForm } from '@/components/log-edit-form';
import { LogTagsForm } from '@/components/log-tags-form';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Fragment, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const LogDropdownMenuForms = ({
  logDeleteFormId,
  logEditFormId,
  logTagsFromId,
  setLogDeleteFormId,
  setLogEditFormId,
  setLogTagsFromId,
}: {
  logDeleteFormId: string | null;
  logEditFormId: string | null;
  logTagsFromId: string | null;
  setLogDeleteFormId: (id: string | null) => void;
  setLogEditFormId: (id: string | null) => void;
  setLogTagsFromId: (id: string | null) => void;
}) => {
  const insets = useSafeAreaInsets();
  const windowDimensions = useWindowDimensions();

  const snapPoints = useMemo(() => {
    return [(windowDimensions.height - insets.top - insets.bottom) * 0.5];
  }, [insets.bottom, insets.top, windowDimensions.height]);

  return (
    <Fragment>
      {logDeleteFormId && (
        <BottomSheet
          onClose={() => setLogDeleteFormId(null)}
          portalName="delete-log-form"
        >
          <LogDeleteForm logId={logDeleteFormId} />
        </BottomSheet>
      )}
      {logEditFormId && (
        <BottomSheet
          onClose={() => setLogEditFormId(null)}
          portalName="log-edit-form"
        >
          <LogEditForm logId={logEditFormId} />
        </BottomSheet>
      )}
      {logTagsFromId && (
        <BottomSheet
          enableDynamicSizing={false}
          onClose={() => setLogTagsFromId(null)}
          portalName="log-tag-form"
          snapPoints={snapPoints}
        >
          <LogTagsForm logId={logTagsFromId} />
        </BottomSheet>
      )}
    </Fragment>
  );
};
