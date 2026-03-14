import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useSheetManager } from '@/context/sheet-manager';
import { useLogColor } from '@/hooks/use-log-color';
import { deleteCommentImage } from '@/mutations/delete-comment-image';
import { publishComment } from '@/mutations/publish-comment';
import { uploadCommentImage } from '@/mutations/upload-comment-image';
import { useCommentDraft } from '@/queries/use-comment-draft';
import { useRecord } from '@/queries/use-record';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { Image as ImageIcon, X } from 'phosphor-react-native';
import { useCallback, useState, useTransition } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

export const CommentCreateSheet = () => {
  const [isDeleteTransitioning, startDeleteTransition] = useTransition();
  const [isUploadTransitioning, startUploadTransition] = useTransition();
  const [text, setText] = useState('');
  const sheetManager = useSheetManager();

  const recordId = sheetManager.getId('comment-create');
  const record = useRecord({ id: recordId });
  const logColor = useLogColor({ id: record.log?.id });
  const draft = useCommentDraft({ recordId });

  const hasContent = !!text.trim() || !!draft.images.length;

  const handleUploadImages = useCallback(async () => {
    const picker = await launchImageLibraryAsync({
      allowsMultipleSelection: true,
      exif: false,
      orderedSelection: true,
    });

    if (picker.canceled) return;

    startUploadTransition(() =>
      Promise.all(
        picker.assets.map((asset) =>
          uploadCommentImage({ asset, commentId: draft.id, recordId })
        )
      )
    );
  }, [draft.id, recordId, startUploadTransition]);

  const handleDeleteImage = useCallback(
    (imageId: string) =>
      startDeleteTransition(async () => {
        await deleteCommentImage({ commentId: draft.id, imageId, recordId });
      }),
    [draft.id, recordId, startDeleteTransition]
  );

  const handleSubmit = useCallback(() => {
    if (!hasContent || !draft.id) return;
    publishComment({ id: draft.id, text: text.trim() });
    sheetManager.close('comment-create');
    setText('');
  }, [draft.id, hasContent, sheetManager, text]);

  return (
    <Sheet
      className="rounded-t-2xl xs:rounded-t-4xl"
      loading={!!recordId && !draft.id}
      onDismiss={() => {
        sheetManager.close('comment-create');
        setText('');
      }}
      open={sheetManager.isOpen('comment-create')}
      portalName="comment-create"
    >
      <View className="mx-auto w-full max-w-lg gap-3 p-4 pb-8 sm:pt-8">
        <View className="max-h-[40dvh] rounded-xl border border-border-secondary bg-input md:max-h-[60dvh]">
          <Textarea
            autoFocus
            className="border-0 bg-transparent"
            maxLength={10240}
            numberOfLines={16}
            onChangeText={setText}
            placeholder="Add a reply"
            value={text}
          />
          {!!draft.images.length && (
            <ScrollView
              className="shrink-0 border-t border-border-secondary"
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ borderCurve: 'continuous' }}
            >
              <View className="flex-row gap-3 p-4">
                {draft.images.map((image) => (
                  <View className="relative" key={image.id}>
                    <Pressable>
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
                      <Icon className="text-foreground" icon={X} />
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
            <Icon icon={ImageIcon} />
            <Text>Add visuals</Text>
          </Button>
          <Button
            disabled={
              isUploadTransitioning || isDeleteTransitioning || !hasContent
            }
            onPress={handleSubmit}
            size="xs"
            style={{ backgroundColor: logColor?.default }}
            variant="secondary"
          >
            <Text className="text-white">Reply</Text>
          </Button>
        </View>
      </View>
    </Sheet>
  );
};
