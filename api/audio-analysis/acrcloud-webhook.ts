import { deleteAcrCloudFile } from '@/api/audio-analysis/acrcloud-client';
import { getMusicTracks } from '@/api/audio-analysis/acrcloud-tracks';
import * as audioAnalysisRepository from '@/api/audio-analysis/repository';
import { createAdminDb } from '@/api/middleware/db';
import { isRecord } from '@/lib/coerce';

const isTerminalAcrCloudState = (state: number) =>
  state === 1 || state === -1 || state === -2 || state === -3;

export const handleAcrCloudWebhook = async ({
  body,
  env,
}: {
  body: unknown;
  env: CloudflareEnv;
}) => {
  if (!isRecord(body)) return { ignored: true };
  const state = Number(body.state);

  const acrCloudFileId =
    typeof body.file_id === 'string' ? body.file_id : undefined;

  try {
    if (typeof body.name !== 'string') return { ignored: true };
    const db = createAdminDb(env);

    const file =
      (await audioAnalysisRepository.getAudioFile(db, body.name)) ??
      (await audioAnalysisRepository.getAudioFileByAssetKey(db, body.name));

    if (!file?.id) return { ignored: true };

    if (state === 1 || state === -1) {
      await audioAnalysisRepository.updateAudioFile(db, file.id, {
        tracks: await getMusicTracks(body.results, env),
      });
    }

    return { success: true };
  } catch (error) {
    console.error('ACRCloud webhook processing failed', {
      acrCloudFileId,
      error,
      name: body.name,
      state,
    });

    throw error;
  } finally {
    if (isTerminalAcrCloudState(state) && acrCloudFileId) {
      try {
        await deleteAcrCloudFile(env, acrCloudFileId);
      } catch (error) {
        console.error('Failed to delete ACRCloud file', {
          acrCloudFileId,
          error,
        });
      }
    }
  }
};
