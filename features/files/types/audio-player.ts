import type { AudioPlaybackRate } from '@/features/files/lib/media-playback-rate';
import type * as React from 'react';

export type AudioClip = {
  assetKey?: string | null;
  duration?: number | null;
  id: string;
  isIdentifying?: boolean | null;
  isTranscribing?: boolean | null;
  name?: string | null;
  size?: number | null;
  tracks?: unknown;
  transcript?: unknown;
  type?: string | null;
  uri?: string | null;
};

export type AudioPlayerProps = {
  active?: boolean;
  assetKey?: string | null;
  autoPlayKey?: number;
  canAnalyzeAudio?: boolean;
  durationSeconds?: number;
  fileId?: string | null;
  isIdentifying?: boolean | null;
  isTranscribing?: boolean | null;
  name?: string | null;
  onDidFinish?: () => void;
  onNextClip?: () => void;
  onPause?: () => void;
  onPlayStart?: () => void;
  onPreviousClip?: () => void;
  onPlaybackRateChange?: (playbackRate: AudioPlaybackRate) => void;
  playbackRate?: AudioPlaybackRate;
  size?: number | null;
  showMetadata?: boolean;
  showPlaybackRate?: boolean;
  trailingAccessory?: React.ReactNode;
  tracks?: unknown;
  transcript?: unknown;
  type?: string | null;
  uri?: string | null;
};
