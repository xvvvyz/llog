import { assetToFileLike } from '@/features/files/lib/asset-to-file-like';
import { PickedFileAsset } from '@/features/files/lib/picked';
import { api, apiOrThrow } from '@/lib/api';

const uploadToStreamUrl = async ({
  asset,
  uploadURL,
}: {
  asset: PickedFileAsset;
  uploadURL: string;
}) => {
  const xhr = new XMLHttpRequest();
  const body = new FormData();
  body.append('file', await assetToFileLike(asset));

  return new Promise<void>((resolve, reject) => {
    xhr.open('POST', uploadURL);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(body);
  });
};

export const directVideoUpload = async ({
  asset,
  fileId,
  order,
  path,
}: {
  asset: PickedFileAsset;
  fileId?: string;
  order?: number;
  path: string;
}) => {
  const response = await apiOrThrow(
    `${path}/video-upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, order, size: asset.size }),
    },
    'Failed to create video upload'
  );

  const { fileId: createdFileId, uploadURL } = (await response.json()) as {
    fileId: string;
    streamUid: string;
    uploadURL: string;
  };

  try {
    await uploadToStreamUrl({ asset, uploadURL });
  } catch (error) {
    await api(`${path}/${createdFileId}`, { method: 'DELETE' }).catch(() => {
      // noop
    });

    throw error;
  }
};
