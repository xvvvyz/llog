import { normalizeReactionEmoji } from '@/domain/records/reactions';
import * as audioPlaybackRateUtils from '@/features/files/lib/audio-playback-rate';
import { isSortBy, type SortBy } from '@/features/logs/lib/sort';
import { db } from '@/lib/db';
import { isSortDirection, type SortDirection } from '@/lib/sort-direction';

export const useUi = () => {
  const auth = db.useAuth();

  const { data, isLoading } = db.useQuery(
    auth.user
      ? { ui: { $: { where: { user: auth.user.id } }, team: {} } }
      : null
  );

  const ui = data?.ui?.[0];
  const doubleTapEmoji = normalizeReactionEmoji(ui?.doubleTapEmoji);

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
