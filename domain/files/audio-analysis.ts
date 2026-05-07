export const MAX_TRANSCRIPTION_DURATION_MS = 15 * 60 * 1000;

export const isAudioAnalysisFileType = (
  type?: string | null
): type is 'audio' | 'video' => type === 'audio' || type === 'video';

export const isTranscriptionDurationTooLong = (duration?: number | null) =>
  typeof duration === 'number' &&
  Number.isFinite(duration) &&
  duration > MAX_TRANSCRIPTION_DURATION_MS;

export const canTranscribeAudioAnalysisFile = (file: {
  duration?: number | null;
  transcript?: string | null;
}) => file.transcript == null && !isTranscriptionDurationTooLong(file.duration);
