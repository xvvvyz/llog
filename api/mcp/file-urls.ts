import * as cloudflareImages from '@/api/files/cloudflare-images';
import { isR2Key } from '@/api/files/r2-keys';
import { getFileR2Url } from '@/api/files/r2-urls';
import type { McpFile } from '@/api/mcp/types';

const isAbsoluteUri = (uri: string) => /^[a-z][a-z\d+.-]*:/i.test(uri);

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
  return getFileR2Url(r2Key, appUrl);
};
