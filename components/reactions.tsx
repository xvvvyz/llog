import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { REACTION_EMOJIS, REACTION_ICONS } from '@/enums/emojis';
import { toggleReaction } from '@/mutations/toggle-reaction';
import { useProfile } from '@/queries/use-profile';
import { Profile } from '@/types/profile';
import { Reaction } from '@/types/reaction';
import { cn } from '@/utilities/cn';
import { useMemo } from 'react';

export const Reactions = ({
  reactions,
  recordId,
  commentId,
}: {
  reactions: (Reaction & { author?: Pick<Profile, 'id'> })[];
  recordId: string;
  commentId?: string;
}) => {
  const profile = useProfile();

  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; userReacted: boolean }>();

    for (const reaction of reactions) {
      const entry = map.get(reaction.emoji) ?? {
        count: 0,
        userReacted: false,
      };

      entry.count++;

      if (reaction.author?.id === profile.id) {
        entry.userReacted = true;
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
          type Emoji = (typeof REACTION_EMOJIS)[number];
          return (
            REACTION_EMOJIS.indexOf(a as Emoji) -
            REACTION_EMOJIS.indexOf(b as Emoji)
          );
        })
        .map(([emoji, { count, userReacted }]) => (
          <Button
            key={emoji}
            className={cn(
              'h-auto gap-1.5 rounded-full border px-2 py-0.5',
              userReacted
                ? 'border-primary bg-primary/10 active:bg-primary/20'
                : 'border-border bg-muted active:bg-accent'
            )}
            variant="ghost"
            wrapperClassName="rounded-full"
            onPress={() => toggleReaction({ emoji, recordId, commentId })}
          >
            <Icon
              className={cn(
                'text-xs',
                userReacted ? 'text-primary' : 'text-foreground'
              )}
              icon={REACTION_ICONS[emoji as keyof typeof REACTION_ICONS]}
              size={14}
            />
            <Text
              className={cn(
                'text-xs',
                userReacted ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {count}
            </Text>
          </Button>
        ))}
    </>
  );
};
