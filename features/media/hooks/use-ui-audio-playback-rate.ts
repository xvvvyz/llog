import * as audioPlaybackRateUtils from '@/features/media/lib/audio-playback-rate';
import { db } from '@/lib/db';
import { useUi } from '@/queries/use-ui';
import * as React from 'react';

export const useUiAudioPlaybackRate = () => {
  const { audioPlaybackRate, id: uiId } = useUi();

  const [localPlaybackRate, setLocalPlaybackRate] =
    React.useState<audioPlaybackRateUtils.AudioPlaybackRate>(
      audioPlaybackRate ?? audioPlaybackRateUtils.DEFAULT_AUDIO_PLAYBACK_RATE
    );

  React.useEffect(() => {
    setLocalPlaybackRate(audioPlaybackRate);
  }, [audioPlaybackRate]);

  const setAudioPlaybackRate = React.useCallback(
    (nextPlaybackRate: audioPlaybackRateUtils.AudioPlaybackRate) => {
      setLocalPlaybackRate(nextPlaybackRate);

      if (uiId) {
        void db.transact(
          db.tx.ui[uiId].update({ audioPlaybackRate: nextPlaybackRate })
        );
      }
    },
    [uiId]
  );

  return {
    audioPlaybackRate: localPlaybackRate,
    setAudioPlaybackRate,
  };
};
