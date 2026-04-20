import { deleteImage } from '@/api/files/images';
import { getMediaR2Keys, isR2Key } from '@/api/files/media-storage';
import { deleteStreamVideo } from '@/api/files/stream';

export const deleteMediaAssets = async (
  env: CloudflareEnv,
  media: Array<{
    assetKey?: string | null;
    uri?: string | null;
  }>
) => {
  const r2Keys = [...new Set(media.flatMap((item) => getMediaR2Keys(item)))];

  const imageSources = [
    ...new Set(media.map((item) => item.assetKey).filter(Boolean)),
  ].filter((item): item is string => !!item && item.startsWith('cf-image:'));

  const streamUids = [
    ...new Set(
      media.flatMap((item) => {
        const assetKey = item.assetKey;

        if (
          !assetKey ||
          assetKey.startsWith('cf-image:') ||
          isR2Key(assetKey)
        ) {
          return [];
        }

        return [assetKey];
      })
    ),
  ];

  await Promise.all([
    r2Keys.length ? env.R2.delete(r2Keys) : undefined,
    ...imageSources.map((sourceKey) =>
      deleteImage(env, sourceKey).catch((error) => {
        console.error('Failed to delete Cloudflare Image', {
          error,
          sourceKey,
        });
      })
    ),
    ...streamUids.map((uid) =>
      deleteStreamVideo(env, uid).catch((error) => {
        console.error('Failed to delete Cloudflare Stream video', {
          error,
          uid,
        });
      })
    ),
  ]);
};
