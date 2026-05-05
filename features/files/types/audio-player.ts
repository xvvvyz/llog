import type { AudioPlaybackRate } from '@/features/files/lib/audio-playback-rate';
import type * as React from 'react';

export type AudioClip = {
  assetKey?: string | null;
  duration?: number | null;
  id: string;
  name?: string | null;
  tracks?: unknown;
  transcript?: string | null;
  uri?: string | null;
};

export type AudioPlayerProps = {
  active?: boolean;
  assetKey?: string | null;
  autoPlayKey?: number;
  durationSeconds?: number;
  name?: string | null;
  onDidFinish?: () => void;
  onNextClip?: () => void;
  onPause?: () => void;
  onPlayStart?: () => void;
  onPreviousClip?: () => void;
  onPlaybackRateChange?: (playbackRate: AudioPlaybackRate) => void;
  playbackRate?: AudioPlaybackRate;
  showPlaybackRate?: boolean;
  trailingAccessory?: React.ReactNode;
  tracks?: unknown;
  transcript?: string | null;
  uri?: string | null;
};
