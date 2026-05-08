import { useUi } from '@/features/account/queries/use-ui';
import * as audioPlaybackRateUtils from '@/features/files/lib/media-playback-rate';
import { db } from '@/lib/db';
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

  return { audioPlaybackRate: localPlaybackRate, setAudioPlaybackRate };
};
