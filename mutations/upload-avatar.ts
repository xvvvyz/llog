import { api } from '@/utilities/api';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

export const uploadAvatar = async () => {
  const picker = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [1, 1],
    mediaTypes: ['images'],
    quality: 1,
  });

  if (picker.canceled) return;

  const dimensions = await new Promise<{ width: number; height: number }>(
    (resolve) => {
      Image.getSize(picker.assets[0].uri, (width, height) =>
        resolve({ width, height })
      );
    }
  );

  const size = 250;
  const aspectRatio = dimensions.width / dimensions.height;
  const newHeight = Math.round(size / aspectRatio);
  const originY = Math.max(0, Math.round((newHeight - size) / 2));

  const manipulated = await ImageManipulator.manipulate(picker.assets[0].uri)
    .resize({ width: size })
    .crop({ height: size, originX: 0, originY, width: size })
    .renderAsync();

  const { uri } = await manipulated.saveAsync({
    compress: 1,
    format: SaveFormat.WEBP,
  });

  const body = new FormData();
  const file = await fetch(uri);
  body.append('file', await file.blob());
  await api('/me/avatar', { body, method: 'PUT' });
};
