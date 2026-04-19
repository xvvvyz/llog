export const normalizeAudioForUpload = async (blob: Blob) =>
  new File([blob], 'recording.m4a', { type: blob.type || 'audio/mp4' });
