import { deleteImage } from '@/api/files/cloudflare-images';
import { deleteStreamVideo } from '@/api/files/cloudflare-stream';
import { getFileR2Keys, isR2Key } from '@/api/files/r2-keys';
import { createAdminDb } from '@/api/middleware/db';

type FileAsset = {
  assetKey?: string | null;
  id?: string | null;
  uri?: string | null;
};

type DeleteFileAssetsOptions = {
  ignoredFileIds?: string[];
  throwOnError?: boolean;
};

export const deleteFileAssets = async (
  env: CloudflareEnv,
  files: FileAsset[],
  options: DeleteFileAssetsOptions = {}
) => {
  const failures: unknown[] = [];
  const r2Keys = [...new Set(files.flatMap((item) => getFileR2Keys(item)))];

  const imageSources = [
    ...new Set(files.map((item) => item.assetKey).filter(Boolean)),
  ].filter((item): item is string => !!item && item.startsWith('cf-image:'));

  const streamUids = [
    ...new Set(
      files.flatMap((item) => {
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
          console.error('Failed to delete R2 file assets', { error, r2Keys });
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
    throw new Error('Failed to delete file assets');
  }
};

export const deleteUnusedFileAssets = async (
  env: CloudflareEnv,
  files: FileAsset[],
  options: DeleteFileAssetsOptions = {}
) => {
  const assetKeys = [
    ...new Set(files.map((item) => item.assetKey).filter(Boolean)),
  ].filter((item): item is string => !!item);

  if (!assetKeys.length) return;
  const ignoredFileIds = new Set(options.ignoredFileIds ?? []);
  let referencedAssetKeys: Set<string>;

  try {
    const { files: references } = await createAdminDb(env).query({
      files: {
        $: {
          fields: ['assetKey', 'id'],
          where: { assetKey: { $in: assetKeys } },
        },
      },
    });

    referencedAssetKeys = new Set(
      references
        .filter((item) => !ignoredFileIds.has(item.id))
        .map((item) => item.assetKey)
        .filter((item): item is string => !!item)
    );
  } catch (error) {
    console.error('Failed to check file asset references', {
      assetKeys,
      error,
    });

    if (options.throwOnError) throw error;
    return;
  }

  const unusedFiles = files.filter(
    (item) => item.assetKey && !referencedAssetKeys.has(item.assetKey)
  );

  if (unusedFiles.length) await deleteFileAssets(env, unusedFiles, options);
};
