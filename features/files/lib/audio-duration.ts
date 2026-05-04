import type { PickedFileAsset } from '@/features/files/lib/picked';
import { durationSecondsToMs, positiveDurationSeconds } from '@/lib/duration';
import { createAudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

const AUDIO_DURATION_TIMEOUT_MS = 3000;

const getWebAudioDuration = (asset: PickedFileAsset) => {
  if (Platform.OS !== 'web' || typeof Audio === 'undefined') return null;

  const objectUrl =
    asset.file && typeof URL !== 'undefined'
      ? URL.createObjectURL(asset.file)
      : undefined;

  const src = objectUrl ?? asset.uri;

  return new Promise<number | undefined>((resolve) => {
    const media = new Audio();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let settled = false;

    const cleanup = () => {
      media.removeEventListener('durationchange', syncDuration);
      media.removeEventListener('loadeddata', syncDuration);
      media.removeEventListener('loadedmetadata', syncDuration);
      media.removeEventListener('error', handleError);
      if (timeout) clearTimeout(timeout);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    const settle = (duration?: number) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(duration);
    };

    function syncDuration() {
      const duration = positiveDurationSeconds(media.duration);
      if (duration) settle(durationSecondsToMs(duration));
    }

    function handleError() {
      settle();
    }

    timeout = setTimeout(() => settle(), AUDIO_DURATION_TIMEOUT_MS);
    media.preload = 'metadata';
    media.addEventListener('durationchange', syncDuration);
    media.addEventListener('loadeddata', syncDuration);
    media.addEventListener('loadedmetadata', syncDuration);
    media.addEventListener('error', handleError);
    media.src = src;
    media.load();
    syncDuration();
  });
};

const getNativeAudioDuration = (uri: string) =>
  new Promise<number | undefined>((resolve) => {
    const player = createAudioPlayer(uri, { updateInterval: 50 });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let settled = false;

    const subscription = player.addListener(
      'playbackStatusUpdate',
      (status) => {
        const duration =
          positiveDurationSeconds(status.duration) ??
          positiveDurationSeconds(player.duration);

        if (duration) settle(durationSecondsToMs(duration));
      }
    );

    const cleanup = () => {
      subscription.remove();
      if (timeout) clearTimeout(timeout);
      player.remove();
    };

    const settle = (duration?: number) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(duration);
    };

    const duration =
      positiveDurationSeconds(player.currentStatus.duration) ??
      positiveDurationSeconds(player.duration);

    if (duration) {
      settle(durationSecondsToMs(duration));
      return;
    }

    timeout = setTimeout(() => {
      const duration =
        positiveDurationSeconds(player.currentStatus.duration) ??
        positiveDurationSeconds(player.duration);

      settle(duration ? durationSecondsToMs(duration) : undefined);
    }, AUDIO_DURATION_TIMEOUT_MS);
  });

export const getAudioAssetDuration = async (asset: PickedFileAsset) => {
  if (asset.type !== 'audio') return undefined;

  try {
    return (
      (await getWebAudioDuration(asset)) ??
      (await getNativeAudioDuration(asset.uri))
    );
  } catch {
    return undefined;
  }
};
