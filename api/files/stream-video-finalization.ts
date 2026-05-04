import { createAdminDb } from '@/api/middleware/db';
import { durationSecondsToMs } from '@/lib/duration';

const getStreamVideoFiles = async (
  adminDb: ReturnType<typeof createAdminDb>,
  streamUid: string
) => {
  const { files } = await adminDb.query({
    files: { $: { where: { assetKey: streamUid } } },
  });

  return files.filter((item) => item.id).map((item) => ({ id: item.id }));
};

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
  const adminDb = createAdminDb(env);
  const files = await getStreamVideoFiles(adminDb, streamUid);
  if (!files.length) return;

  try {
    if (!hlsUri) {
      throw new Error('Cloudflare Stream webhook missing HLS playback URL');
    }

    const resolvedDuration = durationSecondsToMs(duration);

    await adminDb.transact(
      files.map((item) =>
        adminDb.tx.files[item.id].update({
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
