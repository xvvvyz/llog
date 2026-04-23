import { SortBy, isSortBy } from '@/features/logs/components/log-list-actions';
import * as audioPlaybackRateUtils from '@/features/media/lib/audio-playback-rate';
import { db } from '@/lib/db';
import { Emoji, isEmoji } from '@/types/emoji';
import { SortDirection, isSortDirection } from '@/ui/dropdown-menu';

export const useUi = () => {
  const auth = db.useAuth();

  const { data, isLoading } = db.useQuery(
    auth.user
      ? {
          ui: {
            $: { where: { user: auth.user.id } },
            team: {},
          },
        }
      : null
  );

  const ui = data?.ui?.[0];

  const doubleTapEmoji: Emoji = isEmoji(ui?.doubleTapEmoji)
    ? ui.doubleTapEmoji
    : '❤️';

  const audioPlaybackRate = audioPlaybackRateUtils.isAudioPlaybackRate(
    ui?.audioPlaybackRate
  )
    ? ui.audioPlaybackRate
    : audioPlaybackRateUtils.DEFAULT_AUDIO_PLAYBACK_RATE;

  const logsSortBy: SortBy = isSortBy(ui?.logsSortBy)
    ? ui.logsSortBy
    : 'serverCreatedAt';

  const logsSortDirection: SortDirection = isSortDirection(
    ui?.logsSortDirection
  )
    ? ui.logsSortDirection
    : 'desc';

  return {
    activityLastReadDate: ui?.activityLastReadDate,
    activeTeamId: ui?.team?.id,
    audioPlaybackRate,
    doubleTapEmoji,
    id: ui?.id,
    isLoading,
    logsSortBy,
    logsSortDirection,
    videoMuted: ui?.videoMuted ?? true,
  };
};
