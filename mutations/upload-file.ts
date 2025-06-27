import { api } from '@/utilities/api';
import { fileToFileLike } from '@/utilities/file-to-file-like';
import { ImagePickerAsset } from 'expo-image-picker';

export const uploadFile = async (path: string, file: ImagePickerAsset) => {
  const body = new FormData();
  body.append('file', await fileToFileLike(file));
  return api(`/files/${path}`, { body, method: 'PUT' });
};
