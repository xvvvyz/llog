import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useSheetManager } from '@/context/sheet-manager';
import { useLogColor } from '@/hooks/use-log-color';
import { useMediaComposer } from '@/hooks/use-media-composer';
import { deleteCommentMedia } from '@/mutations/delete-comment-media';
import { publishComment } from '@/mutations/publish-comment';
import { uploadCommentMedia } from '@/mutations/upload-comment-media';
import { useCommentDraft } from '@/queries/use-comment-draft';
import { useRecord } from '@/queries/use-record';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

export const CommentCreateSheet = () => {
  const [text, setText] = useState('');
  const sheetManager = useSheetManager();

  const recordId = sheetManager.getId('comment-create');
  const record = useRecord({ id: recordId });
  const logColor = useLogColor({ id: record.log?.id });
  const draft = useCommentDraft({ recordId });

  const isOpen = sheetManager.isOpen('comment-create');
  const hasContent = !!text.trim() || !!draft.media.length;

  const handleUploadImages = useCallback(
    (assets: import('expo-image-picker').ImagePickerAsset[]) =>
      Promise.all(
        assets.map((asset) =>
          uploadCommentMedia({ asset, commentId: draft.id, recordId })
        )
      ) as Promise<any>,
    [draft.id, recordId]
  );

  const handleDeleteMedia = useCallback(
    async (mediaId: string) => {
      await deleteCommentMedia({ commentId: draft.id, mediaId, recordId });
    },
    [draft.id, recordId]
  );

  const { isBusy, mediaPreview, toolbar } = useMediaComposer({
    isOpen,
    media: draft.media,
    onDeleteMedia: handleDeleteMedia,
    onOpenAudio: () =>
      sheetManager.open('record-audio', draft.id, `comment:${recordId}`),
    onUploadImages: handleUploadImages,
  });

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
          {mediaPreview}
        </View>
        <View className="flex-row justify-end gap-3">
          {toolbar}
          <Button
            disabled={isBusy || !hasContent}
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
