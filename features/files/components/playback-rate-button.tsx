import * as audioPlaybackRateUtils from '@/features/files/lib/audio-playback-rate';
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
  buttonSize = 'icon-sm',
  className,
  disabled,
  onPlaybackRateChange,
  playbackRate,
  textClassName,
  wrapperClassName,
}: {
  buttonSize?: 'icon-xs' | 'icon' | 'icon-sm';
  className?: string;
  disabled?: boolean;
  onPlaybackRateChange: (
    playbackRate: audioPlaybackRateUtils.AudioPlaybackRate
  ) => void;
  playbackRate: audioPlaybackRateUtils.AudioPlaybackRate;
  textClassName?: string;
  wrapperClassName?: string;
}) => {
  const label = formatAudioPlaybackRate(playbackRate);

  const handlePress = React.useCallback(() => {
    onPlaybackRateChange(getNextAudioPlaybackRate(playbackRate));
  }, [onPlaybackRateChange, playbackRate]);

  return (
    <Button
      accessibilityLabel={`Playback speed ${label}`}
      className={cn('px-0 shrink-0', className)}
      disabled={disabled}
      onPress={handlePress}
      size={buttonSize}
      variant="ghost"
      wrapperClassName={wrapperClassName}
    >
      <Text
        className={cn(
          'font-normal text-muted-foreground text-xs',
          textClassName
        )}
      >
        {label}
      </Text>
    </Button>
  );
};
