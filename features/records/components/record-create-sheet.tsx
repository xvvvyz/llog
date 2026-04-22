import { useLogColor } from '@/features/logs/hooks/use-log-color';
import { useMediaComposer } from '@/features/media/hooks/use-media-composer';
import { PickedMediaAsset } from '@/features/media/lib/picked-media';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import { deleteRecordMedia } from '@/features/records/mutations/delete-record-media';
import { publishRecord } from '@/features/records/mutations/publish-record';
import { updateRecord } from '@/features/records/mutations/update-record';
import { updateRecordDraft } from '@/features/records/mutations/update-record-draft';
import { uploadRecordMedia } from '@/features/records/mutations/upload-record-media';
import { useRecordDraft } from '@/features/records/queries/use-record-draft';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { db } from '@/lib/db';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import * as React from 'react';
import { Platform, View } from 'react-native';

export const RecordCreateSheet = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [text, setText] = React.useState('');
  const sheetManager = useSheetManager();
  const windowDimensions = useWindowDimensions();
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
  const recordId = record?.id;
  const recordLogId = isEdit ? editRecord?.log?.id : logId;
  const logColor = useLogColor({ id: recordLogId });

  React.useEffect(() => {
    if (!isEdit || !isOpen) return;
    setText(editRecord?.text ?? '');
  }, [editRecord?.text, isEdit, isOpen]);

  const handleUploadMedia = React.useCallback(
    async (asset: PickedMediaAsset, mediaId: string, order: number) => {
      await uploadRecordMedia({
        asset,
        mediaId,
        order,
        recordId,
      });
    },
    [recordId]
  );

  const handleDeleteMedia = React.useCallback(
    async (mediaId: string) => {
      await deleteRecordMedia({ mediaId, recordId });
    },
    [recordId]
  );

  const { isBusy, mediaCount, mediaPreview, toolbar } = useMediaComposer({
    isOpen,
    media: record?.media ?? [],
    onDeleteMedia: handleDeleteMedia,
    onOpenAudio: () => sheetManager.open('record-audio', recordId, 'record'),
    onUploadMedia: handleUploadMedia,
    recordId,
  });

  const currentText = isEdit ? text : (record?.text ?? '');
  const hasContent = !!currentText.trim() || mediaCount > 0;

  const nativeComposerMaxHeight =
    Platform.OS === 'web'
      ? undefined
      : Math.round(windowDimensions.height * 0.4);

  const nativeTextareaStyle =
    Platform.OS === 'web' ? undefined : { maxHeight: 180, minHeight: 120 };

  return (
    <Sheet
      className="xs:rounded-t-4xl rounded-t-2xl"
      loading={isEdit ? !editRecord : !!logId && draft.log?.id !== logId}
      onDismiss={() => {
        sheetManager.close('record-create');
        setText('');
      }}
      open={sheetManager.isOpen('record-create')}
      portalName="record-create"
    >
      <View className="mx-auto w-full max-w-lg gap-3 p-4 pb-8 sm:pt-8">
        <View
          className="border-border-secondary bg-input web:max-h-[40dvh] web:md:max-h-[60dvh] rounded-xl border"
          style={
            nativeComposerMaxHeight
              ? { maxHeight: nativeComposerMaxHeight }
              : undefined
          }
        >
          <Textarea
            autoFocus
            className="max-h-[180px] min-h-[120px] border-0 bg-transparent"
            maxLength={10240}
            numberOfLines={8}
            onChangeText={(nextText) => {
              if (isEdit) {
                setText(nextText);
                return;
              }

              updateRecordDraft({ id: recordId, text: nextText });
            }}
            placeholder="What's happening?"
            style={nativeTextareaStyle}
            value={isEdit ? text : (record?.text ?? '')}
          />
          {mediaPreview}
        </View>
        <View className="flex-row items-center gap-3 px-4">
          <View className="flex-1 flex-row items-center gap-3">{toolbar}</View>
          <Button
            className="web:hover:opacity-90 active:opacity-90"
            disabled={isBusy || isSubmitting || !hasContent}
            onPress={async () => {
              if (!hasContent) return;

              try {
                setIsSubmitting(true);

                if (isEdit) {
                  await updateRecord({ id: recordId, text: text.trim() });
                  sheetManager.close('record-create');
                  setText('');
                } else {
                  await publishRecord({ id: recordId });
                  requestPostSubmitScroll({
                    id: recordLogId,
                    scope: 'log',
                    target: 'top',
                  });
                  sheetManager.close('record-create');
                }
              } finally {
                setIsSubmitting(false);
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
