import { api, apiOrThrow } from '@/utilities/api';
import { assetToFileLike } from '@/utilities/asset-to-file-like';
import { PickedMediaAsset } from '@/utilities/picked-media';

const uploadToStreamUrl = async ({
  asset,
  uploadURL,
}: {
  asset: PickedMediaAsset;
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
  mediaId,
  order,
  path,
}: {
  asset: PickedMediaAsset;
  mediaId?: string;
  order?: number;
  path: string;
}) => {
  const response = await apiOrThrow(
    `${path}/video-upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaId, order }),
    },
    'Failed to create video upload'
  );

  const { mediaId: createdMediaId, uploadURL } = (await response.json()) as {
    mediaId: string;
    streamUid: string;
    uploadURL: string;
  };

  try {
    await uploadToStreamUrl({
      asset,
      uploadURL,
    });
  } catch (error) {
    await api(`${path}/${createdMediaId}`, { method: 'DELETE' }).catch(() => {
      // noop
    });

    throw error;
  }
};
