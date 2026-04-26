import { useProfile } from '@/features/account/queries/use-profile';
import { Profile } from '@/features/account/types/profile';
import { toggleReaction } from '@/features/records/mutations/toggle-reaction';
import { Reaction } from '@/features/records/types/reaction';
import { cn } from '@/lib/cn';
import { REACTION_EMOJIS, REACTION_ICONS } from '@/types/emoji';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { SmileySticker } from 'phosphor-react-native';
import * as React from 'react';

export const EmojiPicker = ({
  color,
  logId,
  recordId,
  teamId,
  replyId,
  reactions,
}: {
  color?: string;
  logId?: string;
  recordId: string;
  teamId?: string;
  replyId?: string;
  reactions?: (Reaction & { author?: Pick<Profile, 'id'> })[];
}) => {
  const profile = useProfile();

  const userReactions = React.useMemo(() => {
    const map = new Map<string, string>();

    for (const reaction of reactions ?? []) {
      if (reaction.author?.id === profile.id) {
        map.set(reaction.emoji, reaction.id);
      }
    }

    return map;
  }, [reactions, profile.id]);

  const usedEmojis = React.useMemo(
    () => new Set((reactions ?? []).map((r) => r.emoji)),
    [reactions]
  );

  if (REACTION_EMOJIS.every((emoji) => usedEmojis.has(emoji))) return null;

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button size="icon-sm" variant="ghost" wrapperClassName="mr-1.5">
          <Icon className="text-muted-foreground" icon={SmileySticker} />
        </Button>
      </Menu.Trigger>
      <Menu.Content align="start" className="flex-row px-1 py-1" sideOffset={2}>
        {REACTION_EMOJIS.map((emoji) => {
          const existingReactionId = userReactions.get(emoji);
          const selected = !!existingReactionId;

          return (
            <Menu.Item
              key={emoji}
              className="min-w-0 size-10 pl-0 pr-0 rounded-xl justify-center"
              onPress={() => {
                if (!teamId) return;

                toggleReaction({
                  emoji,
                  existingReactionId,
                  logId,
                  profileId: profile.id,
                  teamId,
                  recordId,
                  replyId,
                });
              }}
            >
              <Icon
                color={color && selected ? color : undefined}
                icon={REACTION_ICONS[emoji]}
                weight={selected ? 'fill' : 'regular'}
                className={cn(
                  selected && !color && 'text-primary',
                  !selected && 'text-muted-foreground'
                )}
              />
            </Menu.Item>
          );
        })}
      </Menu.Content>
    </Menu.Root>
  );
};
