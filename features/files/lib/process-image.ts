import { assetToFileLike } from '@/features/files/lib/asset-to-file-like';
import { PickedFileAsset } from '@/features/files/lib/picked';
import { ImageSize } from '@/features/files/types/image-size';
import { ImageManipulator } from 'expo-image-manipulator';

export const processImageAsset = async (asset: PickedFileAsset) => {
  let newWidth = asset.width;
  let newHeight = asset.height;

  if (
    asset.width != null &&
    asset.height != null &&
    (asset.width > ImageSize.Record || asset.height > ImageSize.Record)
  ) {
    const scale = Math.min(
      ImageSize.Record / asset.width,
      ImageSize.Record / asset.height
    );

    newWidth = Math.round(asset.width * scale);
    newHeight = Math.round(asset.height * scale);
  }

  let manipulation = ImageManipulator.manipulate(asset.uri);

  if (newWidth != null && newHeight != null) {
    manipulation = manipulation.resize({ height: newHeight, width: newWidth });
  }

  const manipulated = await manipulation.renderAsync();
  const { uri } = await manipulated.saveAsync();

  return assetToFileLike({
    ...asset,
    file: undefined,
    mimeType: 'image/jpeg',
    uri,
  });
};
