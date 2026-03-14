import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { REACTION_EMOJIS, REACTION_ICONS } from '@/enums/emojis';
import { toggleReaction } from '@/mutations/toggle-reaction';
import { SmileySticker } from 'phosphor-react-native';

export const EmojiPicker = ({
  recordId,
  commentId,
}: {
  recordId: string;
  commentId?: string;
}) => {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          className="size-8 rounded-lg"
          size="icon"
          variant="ghost"
          wrapperClassName="rounded-lg"
        >
          <Icon icon={SmileySticker} size={18} />
        </Button>
      </Menu.Trigger>
      <Menu.Content align="start" className="flex-row px-1 py-1" sideOffset={2}>
        {REACTION_EMOJIS.map((emoji) => (
          <Menu.Item
            key={emoji}
            className="h-8 min-w-0 rounded-xl px-2"
            onPress={() => toggleReaction({ emoji, recordId, commentId })}
          >
            <Icon
              className="text-foreground"
              icon={REACTION_ICONS[emoji]}
              size={18}
            />
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
};
