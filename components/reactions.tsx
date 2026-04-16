import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { toggleReaction } from '@/mutations/toggle-reaction';
import { useProfile } from '@/queries/use-profile';
import { Emoji, REACTION_EMOJIS, REACTION_ICONS } from '@/types/emoji';
import { Profile } from '@/types/profile';
import { Reaction } from '@/types/reaction';
import { animation } from '@/utilities/animation';
import { cn } from '@/utilities/cn';
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
        .sort(([a], [b]) => {
          return (
            REACTION_EMOJIS.indexOf(a as Emoji) -
            REACTION_EMOJIS.indexOf(b as Emoji)
          );
        })
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
                icon={REACTION_ICONS[emoji as keyof typeof REACTION_ICONS]}
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
