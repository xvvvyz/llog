import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { REACTION_EMOJIS, REACTION_ICONS } from '@/enums/emojis';
import { toggleReaction } from '@/mutations/toggle-reaction';
import { useProfile } from '@/queries/use-profile';
import { Profile } from '@/types/profile';
import { Reaction } from '@/types/reaction';
import { cn } from '@/utilities/cn';
import { SmileySticker } from 'phosphor-react-native';
import { useMemo } from 'react';

export const EmojiPicker = ({
  color,
  recordId,
  commentId,
  reactions,
}: {
  color?: string;
  recordId: string;
  commentId?: string;
  reactions?: (Reaction & { author?: Pick<Profile, 'id'> })[];
}) => {
  const profile = useProfile();

  const userEmojis = useMemo(() => {
    const set = new Set<string>();

    for (const reaction of reactions ?? []) {
      if (reaction.author?.id === profile.id) {
        set.add(reaction.emoji);
      }
    }

    return set;
  }, [reactions, profile.id]);

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          className="size-8 rounded-lg"
          size="icon"
          variant="ghost"
          wrapperClassName="rounded-lg"
        >
          <Icon icon={SmileySticker} />
        </Button>
      </Menu.Trigger>
      <Menu.Content align="start" className="flex-row px-1 py-1" sideOffset={2}>
        {REACTION_EMOJIS.map((emoji) => {
          const selected = userEmojis.has(emoji);

          return (
            <Menu.Item
              key={emoji}
              className="size-10 min-w-0 justify-center rounded-xl pl-0 pr-0"
              onPress={() => toggleReaction({ emoji, recordId, commentId })}
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
