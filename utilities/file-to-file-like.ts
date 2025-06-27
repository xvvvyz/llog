import { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

export const fileToFileLike = async ({
  fileName,
  type,
  uri,
}: ImagePickerAsset) =>
  Platform.OS === 'web'
    ? (await fetch(uri)).blob()
    : ({ name: fileName, type, uri } as unknown as File);
