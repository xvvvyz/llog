import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useSheetManager } from '@/context/sheet-manager';
import { useLogColor } from '@/hooks/use-log-color';
import { useMediaComposer } from '@/hooks/use-media-composer';
import { deleteRecordMedia } from '@/mutations/delete-record-media';
import { publishRecord } from '@/mutations/publish-record';
import { updateRecordDraft } from '@/mutations/update-record-draft';
import { uploadRecordMedia } from '@/mutations/upload-record-media';
import { useRecordDraft } from '@/queries/use-record-draft';
import { useCallback } from 'react';
import { View } from 'react-native';

export const RecordCreateSheet = () => {
  const sheetManager = useSheetManager();

  const logId = sheetManager.getId('record-create');
  const isOpen = sheetManager.isOpen('record-create');

  const draft = useRecordDraft({ logId });
  const logColor = useLogColor({ id: logId });

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
        recordId: draft.id,
      });
    },
    [draft.id]
  );

  const handleDeleteMedia = useCallback(
    async (mediaId: string) => {
      await deleteRecordMedia({ mediaId, recordId: draft.id });
    },
    [draft.id]
  );

  const { isBusy, mediaPreview, toolbar } = useMediaComposer({
    isOpen,
    media: draft.media,
    onDeleteMedia: handleDeleteMedia,
    onOpenAudio: () => sheetManager.open('record-audio', draft.id, 'record'),
    onUploadMedia: handleUploadMedia,
  });

  return (
    <Sheet
      className="rounded-t-2xl xs:rounded-t-4xl"
      loading={!!logId && draft.log?.id !== logId}
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
            onChangeText={(text) => updateRecordDraft({ id: draft.id, text })}
            placeholder="What's happening?"
            value={draft.text ?? ''}
          />
          {mediaPreview}
        </View>
        <View className="flex-row justify-end gap-3">
          {toolbar}
          <Button
            className="text-white web:hover:opacity-90"
            disabled={isBusy}
            onPress={() => {
              publishRecord({ id: draft.id });
              sheetManager.close('record-create');
            }}
            size="xs"
            style={{ backgroundColor: logColor.default }}
          >
            <Text>Record</Text>
          </Button>
        </View>
      </View>
    </Sheet>
  );
};
