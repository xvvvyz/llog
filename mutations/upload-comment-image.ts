import { ImageSize } from '@/enums/image-size';
import { api } from '@/utilities/api';
import { assetToFileLike } from '@/utilities/asset-to-file-like';
import { ImageManipulator } from 'expo-image-manipulator';
import { ImagePickerAsset } from 'expo-image-picker';

export const uploadCommentImage = async ({
  asset,
  commentId,
  recordId,
}: {
  asset: ImagePickerAsset;
  commentId?: string;
  recordId?: string;
}) => {
  if (!commentId || !recordId) return;
  let newWidth = asset.width;
  let newHeight = asset.height;

  if (asset.width > ImageSize.Record || asset.height > ImageSize.Record) {
    const scale = Math.min(
      ImageSize.Record / asset.width,
      ImageSize.Record / asset.height
    );

    newWidth = Math.round(asset.width * scale);
    newHeight = Math.round(asset.height * scale);
  }

  const manipulated = await ImageManipulator.manipulate(asset.uri)
    .resize({ height: newHeight, width: newWidth })
    .renderAsync();

  const { uri } = await manipulated.saveAsync();
  const body = new FormData();

  body.append(
    'file',
    await assetToFileLike({ ...asset, mimeType: 'image/jpeg', uri })
  );

  await api(`/files/records/${recordId}/comments/${commentId}/images`, {
    body,
    method: 'PUT',
  });
};
