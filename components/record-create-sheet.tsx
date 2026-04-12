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
import { useLog } from '@/queries/use-log';
import { useProfile } from '@/queries/use-profile';
import { useRecordDraft } from '@/queries/use-record-draft';
import { db } from '@/utilities/db';
import { useCallback } from 'react';
import { View } from 'react-native';

export const RecordCreateSheet = () => {
  const sheetManager = useSheetManager();

  const isEdit = sheetManager.getContext('record-create') === 'edit';
  const sheetId = sheetManager.getId('record-create');
  const isOpen = sheetManager.isOpen('record-create');

  const logId = isEdit ? undefined : sheetId;
  const editRecordId = isEdit ? sheetId : undefined;

  const profile = useProfile();
  const draft = useRecordDraft({ logId });
  const log = useLog({ id: logId });

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
  const teamId = isEdit ? editRecord?.teamId : log.teamId;
  const logColor = useLogColor({ id: recordLogId });
  const hasContent = !!record?.text?.trim() || !!record?.media?.length;

  const handleUploadMedia = useCallback(
    async (
      asset: import('expo-image-picker').ImagePickerAsset,
      onProgress: (progress: number) => void,
      mediaId: string,
      order: number
    ) => {
      await uploadRecordMedia({
        asset,
        mediaId,
        onProgress,
        order,
        recordId: record?.id,
      });
    },
    [record?.id]
  );

  const handleDeleteMedia = useCallback(
    async (mediaId: string) => {
      await deleteRecordMedia({ mediaId, recordId: record?.id });
    },
    [record?.id]
  );

  const { isBusy, mediaPreview, toolbar } = useMediaComposer({
    isOpen,
    media: record?.media ?? [],
    onDeleteMedia: handleDeleteMedia,
    onOpenAudio: () => sheetManager.open('record-audio', record?.id, 'record'),
    onUploadMedia: handleUploadMedia,
    recordId: record?.id,
  });

  return (
    <Sheet
      className="rounded-t-2xl xs:rounded-t-4xl"
      loading={isEdit ? !editRecord : !!logId && draft.log?.id !== logId}
      onDismiss={() => sheetManager.close('record-create')}
      open={sheetManager.isOpen('record-create')}
      portalName="record-create"
    >
      <View className="mx-auto w-full max-w-lg gap-3 p-4 pb-8 sm:pt-8">
        <View className="max-h-[40dvh] rounded-xl border border-border-secondary bg-input md:max-h-[60dvh]">
          <Textarea
            autoFocus
            className="border-0 bg-transparent"
            maxLength={10240}
            numberOfLines={16}
            onChangeText={(text) => updateRecordDraft({ id: record?.id, text })}
            placeholder="What's happening?"
            value={record?.text ?? ''}
          />
          {mediaPreview}
        </View>
        <View className="flex-row justify-end gap-3">
          {toolbar}
          <Button
            className="text-white web:hover:opacity-90"
            disabled={isBusy || (!isEdit && !hasContent)}
            onPress={() => {
              if (isEdit) {
                sheetManager.close('record-create');
              } else if (hasContent) {
                publishRecord({
                  id: record?.id,
                  logId: recordLogId,
                  profileId: profile.id,
                  teamId,
                });
                sheetManager.close('record-create');
              }
            }}
            size="xs"
            style={{ backgroundColor: logColor.default }}
          >
            <Text>{isEdit ? 'Done' : 'Record'}</Text>
          </Button>
        </View>
      </View>
    </Sheet>
  );
};
