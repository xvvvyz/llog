import * as cloudflareImages from '@/api/files/cloudflare-images';
import { isR2Key } from '@/api/files/r2-keys';
import type { McpFile } from '@/api/mcp/types';

const isAbsoluteUri = (uri: string) => /^[a-z][a-z\d+.-]*:/i.test(uri);

const encodeR2Key = (key: string) =>
  key.split('/').map(encodeURIComponent).join('/');

export const mcpFileUrl = (
  file: McpFile,
  { appUrl }: { appUrl?: string } = {}
) => {
  const storedImageUrl = cloudflareImages.getStoredImageDeliveryUrl(
    file.assetKey
  );

  if (storedImageUrl) return storedImageUrl;
  if (file.uri && isAbsoluteUri(file.uri)) return file.uri;
  const r2Key = [file.assetKey, file.uri].find(isR2Key);
  if (!r2Key || !appUrl) return file.uri ?? undefined;

  return new URL(
    `/api/v1/files/${encodeR2Key(r2Key)}`,
    new URL(appUrl).origin
  ).toString();
};
