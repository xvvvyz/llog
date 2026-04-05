import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { REACTION_EMOJIS, REACTION_ICONS } from '@/enums/emojis';
import { toggleReaction } from '@/mutations/toggle-reaction';
import { useProfile } from '@/queries/use-profile';
import { useUi } from '@/queries/use-ui';
import { Profile } from '@/types/profile';
import { Reaction } from '@/types/reaction';
import { cn } from '@/utilities/cn';
import { SmileySticker } from 'phosphor-react-native';
import { useMemo } from 'react';

export const EmojiPicker = ({
  color,
  logId,
  recordId,
  commentId,
  reactions,
}: {
  color?: string;
  logId?: string;
  recordId: string;
  commentId?: string;
  reactions?: (Reaction & { author?: Pick<Profile, 'id'> })[];
}) => {
  const profile = useProfile();
  const ui = useUi();

  const userReactions = useMemo(() => {
    const map = new Map<string, string>();

    for (const reaction of reactions ?? []) {
      if (reaction.author?.id === profile.id) {
        map.set(reaction.emoji, reaction.id);
      }
    }

    return map;
  }, [reactions, profile.id]);

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          className="size-8 rounded-lg"
          size="icon"
          variant="ghost"
          wrapperClassName="mr-1.5 rounded-lg"
        >
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
              className="size-10 min-w-0 justify-center rounded-xl pl-0 pr-0"
              onPress={() =>
                toggleReaction({
                  emoji,
                  existingReactionId,
                  logId,
                  profileId: profile.id,
                  teamId: ui.activeTeamId,
                  recordId,
                  commentId,
                })
              }
            >
              <Icon
                className={cn(
                  selected && !color && 'text-primary',
                  !selected && 'text-muted-foreground'
                )}
                icon={REACTION_ICONS[emoji]}
                style={color && selected ? { color } : undefined}
                weight={selected ? 'fill' : 'regular'}
              />
            </Menu.Item>
          );
        })}
      </Menu.Content>
    </Menu.Root>
  );
};
