import { api } from '@/lib/api';

export const transcribeAudioFile = ({ fileId }: { fileId: string }) => {
  return api(`/files/${fileId}/transcribe`, { method: 'POST' });
};

export const detectAudioFileMusic = ({ fileId }: { fileId: string }) => {
  return api(`/files/${fileId}/detect-music`, { method: 'POST' });
};

export const clearAudioFileTranscription = ({ fileId }: { fileId: string }) => {
  return api(`/files/${fileId}/clear-transcription`, { method: 'POST' });
};
