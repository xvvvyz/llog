export const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;

export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export const DEFAULT_PLAYBACK_RATE: PlaybackRate = 1;

export const isPlaybackRate = (value: unknown): value is PlaybackRate =>
  typeof value === 'number' && PLAYBACK_RATES.includes(value as PlaybackRate);

export type AudioPlaybackRate = PlaybackRate;

export const DEFAULT_AUDIO_PLAYBACK_RATE: AudioPlaybackRate =
  DEFAULT_PLAYBACK_RATE;

export const isAudioPlaybackRate = (
  value: unknown
): value is AudioPlaybackRate => isPlaybackRate(value);
