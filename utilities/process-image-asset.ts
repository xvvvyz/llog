import { ImageSize } from '@/enums/image-size';
import { assetToFileLike } from '@/utilities/asset-to-file-like';
import { ImageManipulator } from 'expo-image-manipulator';
import { ImagePickerAsset } from 'expo-image-picker';

export const processImageAsset = async (asset: ImagePickerAsset) => {
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

  return assetToFileLike({ ...asset, mimeType: 'image/jpeg', uri });
};
