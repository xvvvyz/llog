import * as recordReactions from '@/domain/records/reactions';
import { useProfile } from '@/features/account/queries/use-profile';
import { Profile } from '@/features/account/types/profile';
import { groupReactionItems } from '@/features/records/lib/group-reaction-items';
import { REACTION_ICONS } from '@/features/records/lib/reaction-icons';
import { toggleReaction } from '@/features/records/mutations/toggle-reaction';
import { Reaction } from '@/features/records/types/reaction';
import { animation } from '@/lib/animation';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';

export const Reactions = ({
  color,
  leading,
  logId,
  reactions,
  recordId,
  teamId,
  replyId,
}: {
  color?: string;
  leading?: React.ReactNode;
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
      const entry = map.get(reaction.emoji) ?? { count: 0, userReacted: false };
      entry.count++;

      if (reaction.author?.id === profile.id) {
        entry.userReacted = true;
        entry.userReactionId = reaction.id;
      }

      map.set(reaction.emoji, entry);
    }

    return map;
  }, [reactions, profile.id]);

  const reactionEntries = React.useMemo(
    () =>
      Array.from(grouped.entries()).sort(
        ([a], [b]) =>
          recordReactions.REACTION_EMOJIS.indexOf(
            recordReactions.normalizeReactionEmoji(a)
          ) -
          recordReactions.REACTION_EMOJIS.indexOf(
            recordReactions.normalizeReactionEmoji(b)
          )
      ),
    [grouped]
  );

  const reactionGroups = React.useMemo(
    () =>
      groupReactionItems(reactionEntries, {
        leadingGroupSize: reactionEntries.length === 3 ? 1 : undefined,
      }),
    [reactionEntries]
  );

  if (reactionEntries.length === 0) return null;

  return (
    <>
      {reactionGroups.map((reactionGroup, index) => (
        <View
          key={reactionGroup.map(([emoji]) => emoji).join('-')}
          className={cn('flex-row', index === 0 && leading ? 'gap-1' : 'gap-2')}
        >
          {index === 0 && leading}
          {reactionGroup.map(([emoji, reaction]) => {
            const reactionEmoji = recordReactions.normalizeReactionEmoji(emoji);
            const { count, userReacted, userReactionId } = reaction;

            return (
              <Animated.View
                key={emoji}
                entering={animation(ZoomIn)}
                exiting={animation(ZoomOut)}
              >
                <Button
                  className="rounded-lg gap-1.5"
                  size="xs"
                  variant="ghost"
                  wrapperClassName="rounded-lg"
                  onPress={() => {
                    if (!teamId) return;

                    toggleReaction({
                      emoji: reactionEmoji,
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
                    color={userReacted ? color : undefined}
                    icon={REACTION_ICONS[reactionEmoji]}
                    weight={userReacted ? 'fill' : 'regular'}
                    className={cn(
                      '-ml-0.5',
                      userReacted && !color && 'text-primary',
                      !userReacted && 'text-muted-foreground'
                    )}
                  />
                  <Text
                    style={userReacted && color ? { color } : undefined}
                    className={cn(
                      'text-sm',
                      userReacted && !color && 'text-primary',
                      !userReacted && 'text-muted-foreground'
                    )}
                  >
                    {count}
                  </Text>
                </Button>
              </Animated.View>
            );
          })}
        </View>
      ))}
    </>
  );
};
