import { SortBy } from '@/components/log-list-actions';
import { SortDirection } from '@/components/ui/dropdown-menu';
import { Emoji, REACTION_EMOJIS } from '@/enums/emojis';
import { db } from '@/utilities/db';

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

  return {
    activityLastReadDate: ui?.activityLastReadDate,
    activeTeamId: ui?.team?.id,
    doubleTapEmoji: (REACTION_EMOJIS.includes(ui?.doubleTapEmoji as Emoji)
      ? ui?.doubleTapEmoji
      : '❤️') as Emoji,
    id: ui?.id,
    isLoading,
    logsSortBy: (ui?.logsSortBy ?? 'serverCreatedAt') as SortBy,
    logsSortDirection: (ui?.logsSortDirection ?? 'desc') as SortDirection,
    videoMuted: ui?.videoMuted ?? true,
  };
};
