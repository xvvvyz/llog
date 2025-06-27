import { ImageSize } from '@/enums/image-size';
import { api } from '@/utilities/api';
import { uriToFileLike } from '@/utilities/uri-to-file-like';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export const uploadProfileImage = async ({
  image: { height, uri: originalUri, width },
}: {
  image: ImagePicker.ImagePickerAsset;
}) => {
  const aspectRatio = width / height;
  const isLandscape = aspectRatio > 1;

  const newWidth = isLandscape
    ? Math.round(ImageSize.Avatar * aspectRatio)
    : ImageSize.Avatar;

  const newHeight = isLandscape
    ? ImageSize.Avatar
    : Math.round(ImageSize.Avatar / aspectRatio);

  const originX = isLandscape
    ? Math.round((newWidth - ImageSize.Avatar) / 2)
    : 0;

  const originY = isLandscape
    ? 0
    : Math.round((newHeight - ImageSize.Avatar) / 2);

  const manipulated = await ImageManipulator.manipulate(originalUri)
    .resize({ width: newWidth, height: newHeight })
    .crop({
      height: ImageSize.Avatar,
      originX,
      originY,
      width: ImageSize.Avatar,
    })
    .renderAsync();

  const { uri } = await manipulated.saveAsync({ format: SaveFormat.WEBP });
  const body = new FormData();
  body.append('file', await uriToFileLike(uri));
  return api('/files/me/avatar', { body, method: 'PUT' });
};
