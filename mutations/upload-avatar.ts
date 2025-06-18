import { api } from '@/utilities/ui/api';
import { uriToFileLike } from '@/utilities/ui/uri-to-file-like';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const SIZE = 250;

export const uploadAvatar = async () => {
  const picker = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [1, 1],
    mediaTypes: ['images'],
    quality: 1,
  });

  if (picker.canceled) return;
  const { height, uri: originalUri, width } = picker.assets[0];
  const aspectRatio = width / height;

  let newWidth = SIZE;
  let newHeight = SIZE;
  let originX = 0;
  let originY = 0;

  if (aspectRatio > 1) {
    newWidth = Math.round(SIZE * aspectRatio);
    originX = Math.round((newWidth - SIZE) / 2);
  } else {
    newHeight = Math.round(SIZE / aspectRatio);
    originY = Math.round((newHeight - SIZE) / 2);
  }

  const manipulated = await ImageManipulator.manipulate(originalUri)
    .resize({ width: newWidth, height: newHeight })
    .crop({ height: SIZE, originX, originY, width: SIZE })
    .renderAsync();

  const { uri } = await manipulated.saveAsync({ format: SaveFormat.WEBP });
  const body = new FormData();
  body.append('file', await uriToFileLike(uri));
  await api('/me/avatar', { body, method: 'PUT' });
};
