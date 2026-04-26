import type { AudioPlaybackRate } from '@/features/media/lib/audio-playback-rate';
import type * as React from 'react';

export type AudioClip = { duration?: number; id: string; uri: string };

export type AudioPlayerProps = {
  active?: boolean;
  autoPlayKey?: number;
  compact?: boolean;
  duration?: number;
  onDidFinish?: () => void;
  onPause?: () => void;
  onPlayStart?: () => void;
  onPlaybackRateChange?: (playbackRate: AudioPlaybackRate) => void;
  playbackRate?: AudioPlaybackRate;
  showPlaybackRate?: boolean;
  trailingAccessory?: React.ReactNode;
  uri: string;
};
