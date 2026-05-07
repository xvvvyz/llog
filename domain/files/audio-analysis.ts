export const MAX_TRANSCRIPTION_DURATION_MS = 15 * 60 * 1000;

export const MAX_TRANSCRIPTION_UPLOAD_BYTES = 25 * 1024 * 1024;

export const isAudioAnalysisFileType = (
  type?: string | null
): type is 'audio' | 'video' => type === 'audio' || type === 'video';

export const isTranscriptionDurationTooLong = (duration?: number | null) =>
  typeof duration === 'number' &&
  Number.isFinite(duration) &&
  duration > MAX_TRANSCRIPTION_DURATION_MS;

export const isTranscriptionUploadTooLarge = (size?: number | null) =>
  typeof size === 'number' &&
  Number.isFinite(size) &&
  size > MAX_TRANSCRIPTION_UPLOAD_BYTES;

export const canIdentifyAudioAnalysisFile = (file: { tracks?: unknown }) =>
  file.tracks == null;

export const canTranscribeAudioAnalysisFile = (file: {
  duration?: number | null;
  size?: number | null;
  transcript?: unknown;
  type?: string | null;
}) =>
  file.transcript == null &&
  !isTranscriptionDurationTooLong(file.duration) &&
  !(file.type === 'audio' && isTranscriptionUploadTooLarge(file.size));
