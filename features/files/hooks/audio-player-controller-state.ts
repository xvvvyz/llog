import { positiveDurationSeconds } from '@/lib/duration';

export const SEEK_SYNC_TOLERANCE_SECONDS = 0.15;

export const EXACT_SEEK_TOLERANCE_MS = 0;

export const PLAYBACK_REQUEST_PAUSE_GRACE_MS = 1500;

export const PLAYBACK_START_RETRY_DELAYS_MS = [120, 400, 900] as const;

export type PendingSeek = {
  id: number;
  resumePlayback: boolean;
  seconds: number;
};

export type SeekOptions = { skipIfAlreadyThere?: boolean };

export const isWaitingForPlayback = (status: {
  isBuffering: boolean;
  timeControlStatus: string;
}) => status.isBuffering || status.timeControlStatus === 'waiting';

export const getPlayerDuration = ({
  durationSeconds,
  metadataDuration,
  playerDuration,
  statusDuration,
}: {
  durationSeconds?: number;
  metadataDuration?: number | null;
  playerDuration?: number;
  statusDuration?: number;
}) =>
  positiveDurationSeconds(durationSeconds) ??
  metadataDuration ??
  positiveDurationSeconds(statusDuration) ??
  positiveDurationSeconds(playerDuration) ??
  0;

export const getTimeLabelTime = ({
  displayTime,
  effectiveIsPlaying,
  effectivePlaybackTime,
  pendingSeek,
  playerDuration,
  scrubbing,
}: {
  displayTime: number;
  effectiveIsPlaying: boolean;
  effectivePlaybackTime: number;
  pendingSeek: PendingSeek | null;
  playerDuration: number;
  scrubbing: boolean;
}) => {
  const isPreviewingScrubTime =
    !effectiveIsPlaying && Math.abs(displayTime - effectivePlaybackTime) > 0.05;

  const hasPausedProgress = !effectiveIsPlaying && displayTime > 0.05;

  return effectiveIsPlaying ||
    hasPausedProgress ||
    isPreviewingScrubTime ||
    scrubbing ||
    pendingSeek
    ? displayTime
    : playerDuration;
};
