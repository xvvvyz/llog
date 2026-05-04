import type { AudioPlaybackRate } from '@/features/files/lib/audio-playback-rate';
import type * as React from 'react';

export type AudioClip = {
  assetKey?: string | null;
  duration?: number | null;
  id: string;
  uri?: string | null;
};

export type AudioPlayerProps = {
  active?: boolean;
  assetKey?: string | null;
  autoPlayKey?: number;
  durationSeconds?: number;
  onDidFinish?: () => void;
  onPause?: () => void;
  onPlayStart?: () => void;
  onPlaybackRateChange?: (playbackRate: AudioPlaybackRate) => void;
  playbackRate?: AudioPlaybackRate;
  showPlaybackRate?: boolean;
  trailingAccessory?: React.ReactNode;
  uri?: string | null;
};
