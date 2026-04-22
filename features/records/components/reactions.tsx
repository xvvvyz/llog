import { useProfile } from '@/features/account/queries/use-profile';
import { Profile } from '@/features/account/types/profile';
import { toggleReaction } from '@/features/records/mutations/toggle-reaction';
import { Reaction } from '@/features/records/types/reaction';
import { animation } from '@/lib/animation';
import { cn } from '@/lib/cn';
import { REACTION_EMOJIS, REACTION_ICONS, isEmoji } from '@/types/emoji';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import * as React from 'react';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';

export const Reactions = ({
  color,
  logId,
  reactions,
  recordId,
  teamId,
  replyId,
}: {
  color?: string;
  logId?: string;
  reactions: (Reaction & { author?: Pick<Profile, 'id'> })[];
  recordId: string;
  teamId?: string;
  replyId?: string;
}) => {
  const profile = useProfile();

  const grouped = React.useMemo(() => {
    const map = new Map<
      string,
      { count: number; userReacted: boolean; userReactionId?: string }
    >();

    for (const reaction of reactions) {
      const entry = map.get(reaction.emoji) ?? {
        count: 0,
        userReacted: false,
      };

      entry.count++;

      if (reaction.author?.id === profile.id) {
        entry.userReacted = true;
        entry.userReactionId = reaction.id;
      }

      map.set(reaction.emoji, entry);
    }

    return map;
  }, [reactions, profile.id]);

  if (grouped.size === 0) return null;

  return (
    <>
      {Array.from(grouped.entries())
        .sort(
          ([a], [b]) =>
            REACTION_EMOJIS.indexOf(isEmoji(a) ? a : '❤️') -
            REACTION_EMOJIS.indexOf(isEmoji(b) ? b : '❤️')
        )
        .map(([emoji, { count, userReacted, userReactionId }]) => (
          <Animated.View
            key={emoji}
            entering={animation(ZoomIn)}
            exiting={animation(ZoomOut)}
          >
            <Button
              className={cn(
                'gap-1.5 rounded-lg',
                userReacted ? 'active:bg-primary/20' : 'active:bg-accent'
              )}
              size="xs"
              variant="ghost"
              wrapperClassName="rounded-lg"
              onPress={() => {
                if (!teamId) return;

                toggleReaction({
                  emoji,
                  existingReactionId: userReactionId,
                  logId,
                  profileId: profile.id,
                  teamId,
                  recordId,
                  replyId,
                });
              }}
            >
              <Icon
                className={cn(
                  '-ml-0.5',
                  userReacted && !color && 'text-primary',
                  !userReacted && 'text-muted-foreground'
                )}
                icon={
                  isEmoji(emoji) ? REACTION_ICONS[emoji] : REACTION_ICONS['❤️']
                }
                style={userReacted && color ? { color } : undefined}
                weight={userReacted ? 'fill' : 'regular'}
              />
              <Text
                className={cn(
                  'text-sm',
                  userReacted && !color && 'text-primary',
                  !userReacted && 'text-muted-foreground'
                )}
                style={userReacted && color ? { color } : undefined}
              >
                {count}
              </Text>
            </Button>
          </Animated.View>
        ))}
    </>
  );
};
