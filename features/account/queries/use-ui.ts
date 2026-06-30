import { normalizeReactionEmoji } from '@/domain/records/reactions';
import * as audioPlaybackRateUtils from '@/features/files/lib/media-playback-rate';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import { isSortDirection, type SortDirection } from '@/lib/sort-direction';
import * as sort from '@/features/logs/lib/sort';

export const useUi = () => {
  const auth = db.useAuth();

  const { data, isLoading } = db.useQuery(
    auth.user
      ? {
          ui: {
            $: { where: { user: auth.user.id } },
            tags: { $: { fields: ['id'] } },
            team: {},
          },
        }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(auth.user?.id, data);
  const ui = auth.user && hasCurrentResult ? data?.ui?.[0] : undefined;
  const doubleTapEmoji = normalizeReactionEmoji(ui?.doubleTapEmoji);

  const audioPlaybackRate = audioPlaybackRateUtils.isAudioPlaybackRate(
    ui?.audioPlaybackRate
  )
    ? ui.audioPlaybackRate
    : audioPlaybackRateUtils.DEFAULT_AUDIO_PLAYBACK_RATE;

  const logsSortBy: sort.SortBy = sort.isSortBy(ui?.logsSortBy)
    ? ui.logsSortBy
    : sort.DEFAULT_SORT_BY;

  const logsSortDirection: SortDirection = isSortDirection(
    ui?.logsSortDirection
  )
    ? ui.logsSortDirection
    : sort.DEFAULT_SORT_DIRECTION;

  return {
    activityLastReadDate: ui?.activityLastReadDate,
    activeTeamId: ui?.team?.id,
    audioPlaybackRate,
    doubleTapEmoji,
    id: ui?.id,
    isLoading: !!auth.user && (isLoading || !hasCurrentResult),
    logsFilterTagIds: (ui?.tags ?? []).map((tag) => tag.id),
    logsSortBy,
    logsSortDirection,
    videoMuted: ui?.videoMuted ?? true,
  };
};
