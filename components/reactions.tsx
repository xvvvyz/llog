import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Emoji, REACTION_EMOJIS, REACTION_ICONS } from '@/enums/emojis';
import { toggleReaction } from '@/mutations/toggle-reaction';
import { useProfile } from '@/queries/use-profile';
import { useUi } from '@/queries/use-ui';
import { Profile } from '@/types/profile';
import { Reaction } from '@/types/reaction';
import { cn } from '@/utilities/cn';
import { useMemo } from 'react';

export const Reactions = ({
  color,
  reactions,
  recordId,
  commentId,
}: {
  color?: string;
  reactions: (Reaction & { author?: Pick<Profile, 'id'> })[];
  recordId: string;
  commentId?: string;
}) => {
  const profile = useProfile();
  const ui = useUi();

  const grouped = useMemo(() => {
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
          <Button
            key={emoji}
            className={cn(
              'gap-1.5 rounded-lg',
              userReacted ? 'active:bg-primary/20' : 'active:bg-accent'
            )}
            size="xs"
            variant="ghost"
            wrapperClassName="rounded-lg"
            onPress={() =>
              toggleReaction({
                emoji,
                existingReactionId: userReactionId,
                profileId: profile.id,
                teamId: ui.activeTeamId,
                recordId,
                commentId,
              })
            }
          >
            <Icon
              className={cn(
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
        ))}
    </>
  );
};
