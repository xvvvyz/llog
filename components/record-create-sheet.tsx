import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useLogColor } from '@/hooks/use-log-color';
import { useMediaComposer } from '@/hooks/use-media-composer';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { deleteRecordMedia } from '@/mutations/delete-record-media';
import { publishRecord } from '@/mutations/publish-record';
import { updateRecordDraft } from '@/mutations/update-record-draft';
import { uploadRecordMedia } from '@/mutations/upload-record-media';
import { useRecordDraft } from '@/queries/use-record-draft';
import { db } from '@/utilities/db';
import { PickedMediaAsset } from '@/utilities/picked-media';
import { requestPostSubmitScroll } from '@/utilities/post-submit-scroll';
import * as React from 'react';
import { View } from 'react-native';

export const RecordCreateSheet = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const sheetManager = useSheetManager();
  const isEdit = sheetManager.getContext('record-create') === 'edit';
  const isOpen = sheetManager.isOpen('record-create');
  const sheetId = sheetManager.getId('record-create');

  const logId = isEdit ? undefined : sheetId;
  const editRecordId = isEdit ? sheetId : undefined;

  const draft = useRecordDraft({ logId });

  const { data: editData } = db.useQuery(
    editRecordId
      ? {
          records: {
            $: { where: { id: editRecordId } },
            media: {},
            log: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  const editRecord = editData?.records?.[0];
  const record = isEdit ? editRecord : draft;
  const recordLogId = isEdit ? editRecord?.log?.id : logId;
  const logColor = useLogColor({ id: recordLogId });

  const handleUploadMedia = React.useCallback(
    async (asset: PickedMediaAsset, mediaId: string, order: number) => {
      await uploadRecordMedia({
        asset,
        mediaId,
        order,
        recordId: record?.id,
      });
    },
    [record?.id]
  );

  const handleDeleteMedia = React.useCallback(
    async (mediaId: string) => {
      await deleteRecordMedia({ mediaId, recordId: record?.id });
    },
    [record?.id]
  );

  const { isBusy, mediaCount, mediaPreview, toolbar } = useMediaComposer({
    isOpen,
    media: record?.media ?? [],
    onDeleteMedia: handleDeleteMedia,
    onOpenAudio: () => sheetManager.open('record-audio', record?.id, 'record'),
    onUploadMedia: handleUploadMedia,
    recordId: record?.id,
  });

  const hasContent = !!record?.text?.trim() || mediaCount > 0;

  return (
    <Sheet
      className="xs:rounded-t-4xl rounded-t-2xl"
      loading={isEdit ? !editRecord : !!logId && draft.log?.id !== logId}
      onDismiss={() => sheetManager.close('record-create')}
      open={sheetManager.isOpen('record-create')}
      portalName="record-create"
    >
      <View className="mx-auto w-full max-w-lg gap-3 p-4 pb-8 sm:pt-8">
        <View className="border-border-secondary bg-input max-h-[40dvh] rounded-xl border md:max-h-[60dvh]">
          <Textarea
            autoFocus
            className="max-h-[180px] min-h-[120px] border-0 bg-transparent"
            maxLength={10240}
            numberOfLines={8}
            onChangeText={(text) => updateRecordDraft({ id: record?.id, text })}
            placeholder="What's happening?"
            value={record?.text ?? ''}
          />
          {mediaPreview}
        </View>
        <View className="flex-row justify-end gap-3">
          {toolbar}
          <Button
            className="web:hover:opacity-90 text-white active:opacity-90"
            disabled={isBusy || isSubmitting || (!isEdit && !hasContent)}
            onPress={async () => {
              if (isEdit) {
                sheetManager.close('record-create');
              } else if (hasContent) {
                try {
                  setIsSubmitting(true);
                  await publishRecord({ id: record?.id });
                  requestPostSubmitScroll({
                    id: recordLogId,
                    scope: 'log',
                    target: 'top',
                  });
                  sheetManager.close('record-create');
                } finally {
                  setIsSubmitting(false);
                }
              }
            }}
            size="xs"
            style={{ backgroundColor: logColor.default }}
          >
            <Text>{isSubmitting ? 'Saving…' : isEdit ? 'Done' : 'Record'}</Text>
          </Button>
        </View>
      </View>
    </Sheet>
  );
};
