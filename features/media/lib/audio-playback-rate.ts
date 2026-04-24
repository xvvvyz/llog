export const AUDIO_PLAYBACK_RATES = [1, 1.5, 2] as const;
export type AudioPlaybackRate = (typeof AUDIO_PLAYBACK_RATES)[number];

export const DEFAULT_AUDIO_PLAYBACK_RATE: AudioPlaybackRate =
  AUDIO_PLAYBACK_RATES[0];

export const isAudioPlaybackRate = (
  value: unknown
): value is AudioPlaybackRate =>
  typeof value === 'number' &&
  AUDIO_PLAYBACK_RATES.includes(value as AudioPlaybackRate);
