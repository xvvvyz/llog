import { createAdminDb } from '@/api/middleware/db';

const getAdminDb = (env: CloudflareEnv) => createAdminDb(env);

export const finalizeStreamVideo = async ({
  duration,
  env,
  hlsUri,
  streamUid,
  thumbnailUri,
}: {
  duration?: number;
  env: CloudflareEnv;
  hlsUri?: string | null;
  streamUid: string;
  thumbnailUri?: string | null;
}) => {
  const adminDb = getAdminDb(env);

  const { media } = await adminDb.query({
    media: { $: { where: { assetKey: streamUid } } },
  });

  const items = media.filter((item) => item.id);
  if (!items.length) return;

  try {
    if (!hlsUri) {
      throw new Error('Cloudflare Stream webhook missing HLS playback URL');
    }

    const resolvedDuration =
      Number.isFinite(duration) && duration != null && duration >= 0
        ? duration
        : undefined;

    await adminDb.transact(
      items.map((item) =>
        adminDb.tx.media[item.id].update({
          assetKey: streamUid,
          ...(resolvedDuration != null ? { duration: resolvedDuration } : {}),
          thumbnailUri: thumbnailUri ?? undefined,
          uri: hlsUri,
        })
      )
    );
  } catch (error) {
    console.error('Video finalization failed', { error, streamUid });
  }
};
