import { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

export const assetToFileLike = async (file: ImagePickerAsset) =>
  Platform.OS === 'web'
    ? (await fetch(file.uri)).blob()
    : ({ name: '_', type: file.mimeType, uri: file.uri } as unknown as File);
