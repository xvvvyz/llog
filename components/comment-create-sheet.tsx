import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useSheetManager } from '@/context/sheet-manager';
import { useLogColor } from '@/hooks/use-log-color';
import { useMediaComposer } from '@/hooks/use-media-composer';
import { deleteCommentMedia } from '@/mutations/delete-comment-media';
import { publishComment } from '@/mutations/publish-comment';
import { updateComment } from '@/mutations/update-comment';
import { uploadCommentMedia } from '@/mutations/upload-comment-media';
import { useCommentDraft } from '@/queries/use-comment-draft';
import { useProfile } from '@/queries/use-profile';
import { useRecord } from '@/queries/use-record';
import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

export const CommentCreateSheet = () => {
  const [text, setText] = useState('');
  const sheetManager = useSheetManager();

  const editRecordId = sheetManager.getContext('comment-create');
  const isEdit = !!editRecordId;
  const sheetId = sheetManager.getId('comment-create');

  const recordId = isEdit ? editRecordId : sheetId;
  const editCommentId = isEdit ? sheetId : undefined;

  const profile = useProfile();
  const ui = useUi();
  const record = useRecord({ id: recordId });
  const logColor = useLogColor({ id: record.log?.id });
  const draft = useCommentDraft({ recordId: isEdit ? undefined : recordId });

  const { data: editData } = db.useQuery(
    editCommentId
      ? {
          comments: {
            $: { where: { id: editCommentId } },
            media: {},
          },
        }
      : null
  );

  const editComment = editData?.comments?.[0];
  const comment = isEdit ? editComment : draft;
  const commentId = comment?.id;

  const isOpen = sheetManager.isOpen('comment-create');
  const hasContent = !!text.trim() || !!(comment?.media ?? []).length;

  useEffect(() => {
    if (isEdit && editComment?.text && isOpen) {
      setText(editComment.text);
    }
  }, [isEdit, editComment?.text, isOpen]);

  const handleUploadMedia = useCallback(
    async (
      asset: import('expo-image-picker').ImagePickerAsset,
      onProgress: (progress: number) => void,
      mediaId: string,
      order: number
    ) => {
      await uploadCommentMedia({
        asset,
        commentId,
        mediaId,
        onProgress,
        order,
        recordId,
      });
    },
    [commentId, recordId]
  );

  const handleDeleteMedia = useCallback(
    async (mediaId: string) => {
      await deleteCommentMedia({ commentId, mediaId, recordId });
    },
    [commentId, recordId]
  );

  const { isBusy, mediaPreview, toolbar } = useMediaComposer({
    commentId,
    isOpen,
    media: comment?.media ?? [],
    onDeleteMedia: handleDeleteMedia,
    onOpenAudio: () =>
      sheetManager.open('record-audio', commentId, `comment:${recordId}`),
    onUploadMedia: handleUploadMedia,
    recordId,
  });

  const handleSubmit = useCallback(() => {
    if (!hasContent || !commentId) return;

    if (isEdit) {
      updateComment({ id: commentId, text: text.trim() });
    } else {
      publishComment({
        id: commentId,
        text: text.trim(),
        logId: record.log?.id,
        profileId: profile.id,
        recordId,
        teamId: ui.activeTeamId,
      });
    }

    sheetManager.close('comment-create');
    setText('');
  }, [
    commentId,
    hasContent,
    isEdit,
    profile.id,
    record.log?.id,
    recordId,
    sheetManager,
    text,
    ui.activeTeamId,
  ]);

  return (
    <Sheet
      className="rounded-t-2xl xs:rounded-t-4xl"
      loading={isEdit ? !editComment : !!recordId && !draft.id}
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
            <Text className="text-white">{isEdit ? 'Done' : 'Reply'}</Text>
          </Button>
        </View>
      </View>
    </Sheet>
  );
};
