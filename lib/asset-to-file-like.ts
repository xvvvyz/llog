import { FileLike } from '@/types/file-like';
import { Platform } from 'react-native';

type FileBackedAsset = {
  file?: File;
  fileName?: string | null;
  mimeType?: string | null;
  uri: string;
};

export const assetToFileLike = async (
  file: FileBackedAsset
): Promise<FileLike> =>
  Platform.OS === 'web'
    ? file.file ||
      new File(
        [await (await fetch(file.uri)).blob()],
        file.fileName || 'blob',
        {
          type: file.mimeType || 'application/octet-stream',
        }
      )
    : {
        name: file.fileName || 'blob',
        type: file.mimeType || 'application/octet-stream',
        uri: file.uri,
      };
