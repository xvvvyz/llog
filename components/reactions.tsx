import { Text } from '@/components/ui/text';
import { toggleReaction } from '@/mutations/toggle-reaction';
import { useProfile } from '@/queries/use-profile';
import { Profile } from '@/types/profile';
import { Reaction } from '@/types/reaction';
import { cn } from '@/utilities/cn';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

export const Reactions = ({
  reactions,
  recordId,
  commentId,
}: {
  reactions: (Reaction & { author?: Pick<Profile, 'id'> })[];
  recordId?: string;
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
      {Array.from(grouped.entries()).map(([emoji, { count, userReacted }]) => (
        <Pressable
          key={emoji}
          className={cn(
            'flex-row items-center gap-0.5 rounded-full border px-1.5 py-0.5',
            userReacted
              ? 'border-primary bg-primary/10'
              : 'border-border bg-muted'
          )}
          onPress={() => toggleReaction({ emoji, recordId, commentId })}
        >
          <Text className="text-xs">{emoji}</Text>
          <Text
            className={cn(
              'text-xs',
              userReacted ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {count}
          </Text>
        </Pressable>
      ))}
    </>
  );
};
