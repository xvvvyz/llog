import { ImageSize } from '@/enums/image-size';
import { api } from '@/utilities/api';
import { assetToFileLike } from '@/utilities/asset-to-file-like';
import { ImageManipulator } from 'expo-image-manipulator';
import { ImagePickerAsset } from 'expo-image-picker';

export const uploadProfileImage = async (asset: ImagePickerAsset) => {
  const aspectRatio = asset.width / asset.height;
  const isLandscape = aspectRatio > 1;
  let newHeight = ImageSize.Avatar;
  let newWidth = ImageSize.Avatar;
  let originX = 0;
  let originY = 0;

  if (isLandscape) {
    newWidth = Math.round(ImageSize.Avatar * aspectRatio);
    originX = Math.round((newWidth - ImageSize.Avatar) / 2);
  } else {
    newHeight = Math.round(ImageSize.Avatar / aspectRatio);
    originY = Math.round((newHeight - ImageSize.Avatar) / 2);
  }

  const manipulated = await ImageManipulator.manipulate(asset.uri)
    .resize({ width: newWidth, height: newHeight })
    .crop({
      height: ImageSize.Avatar,
      originX,
      originY,
      width: ImageSize.Avatar,
    })
    .renderAsync();

  const { uri } = await manipulated.saveAsync();
  const body = new FormData();
  const file = await assetToFileLike({ ...asset, mimeType: 'image/jpeg', uri });
  body.append('file', file);
  await api(`/files/me/avatar`, { body, method: 'PUT' });
};
