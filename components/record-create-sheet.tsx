import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useSheetManager } from '@/context/sheet-manager';
import { useLogColor } from '@/hooks/use-log-color';
import { deleteRecordImage } from '@/mutations/delete-record-image';
import { publishRecord } from '@/mutations/publish-record';
import { updateRecordDraft } from '@/mutations/update-record-draft';
import { uploadRecordImage } from '@/mutations/upload-record-image';
import { useRecordDraft } from '@/queries/use-record-draft';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { Image as ImageIcon, X } from 'phosphor-react-native';
import { useCallback, useTransition } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

export const RecordCreateSheet = () => {
  const [isDeleteTransitioning, startDeleteTransition] = useTransition();
  const [isUploadTransitioning, startUploadTransition] = useTransition();
  const sheetManager = useSheetManager();

  const logId = sheetManager.getId('record-create');

  const draft = useRecordDraft({ logId });
  const logColor = useLogColor({ id: logId });

  const handleUploadImages = useCallback(async () => {
    const picker = await launchImageLibraryAsync({
      allowsMultipleSelection: true,
      exif: false,
      orderedSelection: true,
    });

    if (picker.canceled) return;

    startUploadTransition(async () => {
      for (const asset of picker.assets) {
        await uploadRecordImage({ asset, recordId: draft.id });
      }
    });
  }, [draft.id, startUploadTransition]);

  const handleDeleteImage = useCallback(
    (imageId: string) =>
      startDeleteTransition(async () => {
        await deleteRecordImage({ imageId, recordId: draft.id });
      }),
    [draft.id, startDeleteTransition]
  );

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
          {!!draft.images.length && (
            <ScrollView
              className="shrink-0"
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ borderCurve: 'continuous' }}
            >
              <View className="flex-row gap-3 p-4">
                {draft.images.map((image) => (
                  <View className="relative" key={image.id}>
                    <Pressable
                      onPress={() =>
                        sheetManager.open('record-images', draft.id, image.id)
                      }
                    >
                      <Image
                        height={64}
                        uri={image.uri}
                        width={64}
                        wrapperClassName="rounded"
                      />
                    </Pressable>
                    <Button
                      className="size-6 rounded-full"
                      onPress={() => handleDeleteImage(image.id)}
                      size="icon"
                      variant="link"
                      wrapperClassName="transition-colors rounded-full bg-background/50 hover:bg-background/60 absolute right-1 top-1"
                    >
                      <Icon className="text-foreground" icon={X} size={16} />
                    </Button>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
        <View className="flex-row justify-end gap-3">
          <Button
            disabled={isUploadTransitioning}
            onPress={handleUploadImages}
            size="xs"
            variant="secondary"
          >
            <Icon icon={ImageIcon} size={16} />
            <Text>Add visuals</Text>
          </Button>
          <Button
            className="text-white web:hover:opacity-90"
            disabled={isUploadTransitioning || isDeleteTransitioning}
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
