import { db } from '@/utilities/db';

export const apiUpload = async (
  path: string,
  body: FormData
): Promise<void> => {
  const auth = await db.getAuth();
  if (!auth) return;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${process.env.EXPO_PUBLIC_API_URL}${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${auth.refresh_token}`);

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
