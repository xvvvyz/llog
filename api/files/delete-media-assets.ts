import { deleteImage } from '@/api/files/cloudflare-images';
import { deleteStreamVideo } from '@/api/files/cloudflare-stream';
import { getMediaR2Keys, isR2Key } from '@/api/files/r2-keys';
import { createAdminDb } from '@/api/middleware/db';

type MediaAsset = {
  assetKey?: string | null;
  id?: string | null;
  uri?: string | null;
};

type DeleteMediaAssetsOptions = {
  ignoredMediaIds?: string[];
  throwOnError?: boolean;
};

export const deleteMediaAssets = async (
  env: CloudflareEnv,
  media: MediaAsset[],
  options: DeleteMediaAssetsOptions = {}
) => {
  const failures: unknown[] = [];
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

  const recordFailure = (error: unknown) => {
    failures.push(error);
  };

  await Promise.all([
    r2Keys.length
      ? env.R2.delete(r2Keys).catch((error) => {
          console.error('Failed to delete R2 media assets', { error, r2Keys });
          recordFailure(error);
        })
      : undefined,
    ...imageSources.map((sourceKey) =>
      deleteImage(env, sourceKey).catch((error) => {
        console.error('Failed to delete Cloudflare Image', {
          error,
          sourceKey,
        });

        recordFailure(error);
      })
    ),
    ...streamUids.map((uid) =>
      deleteStreamVideo(env, uid).catch((error) => {
        console.error('Failed to delete Cloudflare Stream video', {
          error,
          uid,
        });

        recordFailure(error);
      })
    ),
  ]);

  if (options.throwOnError && failures.length) {
    throw new Error('Failed to delete media assets');
  }
};

export const deleteUnusedMediaAssets = async (
  env: CloudflareEnv,
  media: MediaAsset[],
  options: DeleteMediaAssetsOptions = {}
) => {
  const assetKeys = [
    ...new Set(media.map((item) => item.assetKey).filter(Boolean)),
  ].filter((item): item is string => !!item);

  if (!assetKeys.length) return;
  const ignoredMediaIds = new Set(options.ignoredMediaIds ?? []);
  let referencedAssetKeys: Set<string>;

  try {
    const { media: references } = await createAdminDb(env).query({
      media: {
        $: {
          fields: ['assetKey', 'id'],
          where: { assetKey: { $in: assetKeys } },
        },
      },
    });

    referencedAssetKeys = new Set(
      references
        .filter((item) => !ignoredMediaIds.has(item.id))
        .map((item) => item.assetKey)
        .filter((item): item is string => !!item)
    );
  } catch (error) {
    console.error('Failed to check media asset references', {
      assetKeys,
      error,
    });

    if (options.throwOnError) throw error;
    return;
  }

  const unusedMedia = media.filter(
    (item) => item.assetKey && !referencedAssetKeys.has(item.assetKey)
  );

  if (unusedMedia.length) await deleteMediaAssets(env, unusedMedia, options);
};
