import { PickedFileAsset } from '@/features/files/lib/picked';
import { uploadFile } from '@/features/files/mutations/requests';

export const uploadRecordFile = async ({
  asset,
  audioUri,
  duration,
  fileId,
  order,
  recordId,
}: {
  asset?: PickedFileAsset;
  audioUri?: string;
  duration?: number;
  fileId?: string;
  order?: number;
  recordId?: string;
}) => {
  if (!recordId) return;

  await uploadFile({
    asset,
    audioUri,
    duration,
    fileId,
    order,
    path: `/files/records/${recordId}/files`,
  });
};
