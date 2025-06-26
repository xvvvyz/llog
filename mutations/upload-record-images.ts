import { api } from '@/utilities/api';
import { uriToFileLike } from '@/utilities/uri-to-file-like';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const MAX_SIZE = 1024;

export const uploadRecordImages = async ({
  images,
  recordId,
}: {
  images: ImagePicker.ImagePickerAsset[];
  recordId?: string;
}) => {
  if (!recordId) return;

  for (const { height, width, uri: originalUri } of images) {
    let newWidth = width;
    let newHeight = height;

    if (width > MAX_SIZE || height > MAX_SIZE) {
      const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height);
      newWidth = Math.round(width * scale);
      newHeight = Math.round(height * scale);
    }

    const manipulated = await ImageManipulator.manipulate(originalUri)
      .resize({ height: newHeight, width: newWidth })
      .renderAsync();

    const { uri } = await manipulated.saveAsync({ format: SaveFormat.WEBP });
    const body = new FormData();
    body.append('file', await uriToFileLike(uri));
    await api(`/files/records/${recordId}/images`, { body, method: 'PUT' });
  }
};
