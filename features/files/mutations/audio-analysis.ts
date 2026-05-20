import { apiOrThrow } from '@/lib/api';

export const transcribeAudioFile = async ({ fileId }: { fileId: string }) => {
  await apiOrThrow(`/files/${fileId}/transcribe`, { method: 'POST' });
};

export const detectAudioFileMusic = async ({ fileId }: { fileId: string }) => {
  await apiOrThrow(`/files/${fileId}/detect-music`, { method: 'POST' });
};

export const clearAudioFileTranscription = async ({
  fileId,
}: {
  fileId: string;
}) => {
  await apiOrThrow(`/files/${fileId}/clear-transcription`, { method: 'POST' });
};
