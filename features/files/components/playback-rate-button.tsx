import * as audioPlaybackRateUtils from '@/features/files/lib/audio-playback-rate';
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
  disabled,
  onPlaybackRateChange,
  playbackRate,
}: {
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
      className="px-0 shrink-0"
      disabled={disabled}
      onPress={handlePress}
      size="icon-sm"
      variant="ghost"
    >
      <Text className="font-normal text-muted-foreground text-xs">{label}</Text>
    </Button>
  );
};
