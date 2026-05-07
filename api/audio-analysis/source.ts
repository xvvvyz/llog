import type { AudioFile } from '@/api/audio-analysis/types';
import { resolveStreamAudioDownload } from '@/api/files/cloudflare-stream';
import { getFileR2Url } from '@/api/files/r2-urls';
import { isAudioAnalysisFileType } from '@/domain/files/audio-analysis';

const PENDING_STREAM_URI_PREFIX = 'stream-pending:';
type AudioAssetFile = AudioFile & { assetKey: string; type: 'audio' };
type VideoAssetFile = AudioFile & { assetKey: string; type: 'video' };

export type AnalysisAssetFile = AudioAssetFile | VideoAssetFile;

export type AudioAnalysisSource =
  | { assetKey: string; file: AudioAssetFile; kind: 'r2'; url: string }
  | {
      contentType: string;
      file: VideoAssetFile;
      fileName: string;
      kind: 'stream';
      url: string;
    };

export type AudioAnalysisSourceResult =
  | { source: AudioAnalysisSource; status: 'ready' }
  | { status: 'pending' };

export const hasAudioAnalysisAssetFile = (
  file?: AudioFile
): file is AnalysisAssetFile =>
  !!file?.id && !!file.assetKey && isAudioAnalysisFileType(file.type);

const isPendingStreamVideoFile = (file: VideoAssetFile) =>
  !file.uri || file.uri.startsWith(PENDING_STREAM_URI_PREFIX);

export const resolveAudioAnalysisSource = async ({
  env,
  file,
}: {
  env: CloudflareEnv;
  file: AnalysisAssetFile;
}): Promise<AudioAnalysisSourceResult> => {
  if (file.type === 'audio') {
    return {
      source: {
        assetKey: file.assetKey,
        file,
        kind: 'r2',
        url: getFileR2Url(file.assetKey, env.APP_URL),
      },
      status: 'ready',
    };
  }

  if (isPendingStreamVideoFile(file)) return { status: 'pending' };
  const download = await resolveStreamAudioDownload(env, file.assetKey);

  switch (download.status) {
    case 'inprogress': {
      return { status: 'pending' };
    }

    case 'error': {
      throw new Error('Cloudflare Stream audio download failed');
    }

    case 'ready': {
      return {
        source: {
          contentType: 'audio/mp4',
          file,
          fileName: 'audio.m4a',
          kind: 'stream',
          url: download.url,
        },
        status: 'ready',
      };
    }
  }
};
