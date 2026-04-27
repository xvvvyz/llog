import { PickedFileAsset } from '@/features/files/lib/picked';
import { uploadFile } from '@/features/files/mutations/requests';

export const uploadReplyFile = async ({
  asset,
  audioUri,
  replyId,
  duration,
  fileId,
  order,
  recordId,
}: {
  asset?: PickedFileAsset;
  audioUri?: string;
  replyId?: string;
  duration?: number;
  fileId?: string;
  order?: number;
  recordId?: string;
}) => {
  if (!replyId || !recordId) return;

  await uploadFile({
    asset,
    audioUri,
    duration,
    fileId,
    order,
    path: `/files/records/${recordId}/replies/${replyId}/files`,
  });
};
