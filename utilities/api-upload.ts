import { db } from '@/utilities/db';

export const apiUpload = async (
  path: string,
  body: FormData,
  onProgress?: (progress: number) => void
): Promise<void> => {
  const auth = await db.getAuth();
  if (!auth) return;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${process.env.EXPO_PUBLIC_API_URL}${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${auth.refresh_token}`);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

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
