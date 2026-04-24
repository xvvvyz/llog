import * as audioPlaybackRateUtils from '@/features/media/lib/audio-playback-rate';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Text } from '@/ui/text';
import * as React from 'react';

const getNextAudioPlaybackRate = (
  playbackRate: audioPlaybackRateUtils.AudioPlaybackRate
): audioPlaybackRateUtils.AudioPlaybackRate => {
  const index =
    audioPlaybackRateUtils.AUDIO_PLAYBACK_RATES.indexOf(playbackRate);

  return audioPlaybackRateUtils.AUDIO_PLAYBACK_RATES[
    (index + 1) % audioPlaybackRateUtils.AUDIO_PLAYBACK_RATES.length
  ];
};

const formatAudioPlaybackRate = (
  playbackRate: audioPlaybackRateUtils.AudioPlaybackRate
) => (playbackRate === 1.5 ? '1.5' : `${playbackRate}x`);

export const PlaybackRateButton = ({
  compact,
  disabled,
  onPlaybackRateChange,
  playbackRate,
}: {
  compact?: boolean;
  disabled?: boolean;
  onPlaybackRateChange: (
    playbackRate: audioPlaybackRateUtils.AudioPlaybackRate
  ) => void;
  playbackRate: audioPlaybackRateUtils.AudioPlaybackRate;
}) => {
  const label = formatAudioPlaybackRate(playbackRate);

  const handlePress = React.useCallback(() => {
    onPlaybackRateChange(getNextAudioPlaybackRate(playbackRate));
  }, [onPlaybackRateChange, playbackRate]);

  return (
    <Button
      accessibilityLabel={`Playback speed ${label}`}
      className={cn('ml-2 shrink-0 px-0', compact ? 'h-6 w-6' : 'h-8 w-8')}
      disabled={disabled}
      onPress={handlePress}
      size="xs"
      variant="ghost"
    >
      <Text className="font-normal text-muted-foreground text-xs tabular-nums">
        {label}
      </Text>
    </Button>
  );
};
