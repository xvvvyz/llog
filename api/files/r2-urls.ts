export const encodeR2Key = (key: string) =>
  key.split('/').map(encodeURIComponent).join('/');

export const getFileR2Url = (key: string, appUrl: string) =>
  new URL(
    `/api/v1/files/${encodeR2Key(key)}`,
    new URL(appUrl).origin
  ).toString();
