import { TagChipList } from '@/features/tags/components/tag-chip-list';
import type { Tag } from '@/features/tags/types/tag';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Plus } from 'phosphor-react-native';
import { View } from 'react-native';

type AddTagsInputTag = Pick<Tag, 'color' | 'id' | 'name'>;

export const AddTagsInput = ({
  className,
  disabled,
  onPress,
  placeholder = 'Add tags',
  showAction,
  tags,
}: {
  className?: string;
  disabled?: boolean;
  onPress?: () => void;
  placeholder?: string;
  showAction?: boolean;
  tags?: AddTagsInputTag[];
}) => {
  const visibleTags = (tags ?? []).filter((tag) => !!tag.name);
  const shouldShowAction = showAction ?? !!onPress;

  const content =
    visibleTags.length > 0 ? (
      <View className="flex-1 min-w-0">
        <TagChipList
          chipClassName="light:bg-muted"
          className="min-w-0 w-full gap-1"
          maxVisible={visibleTags.length}
          tags={visibleTags}
        />
      </View>
    ) : (
      <Text className="flex-1 font-normal text-muted-foreground">
        {placeholder}
      </Text>
    );

  const actionIcon = shouldShowAction ? (
    <View
      className={cn(
        '-mr-[9px] ml-2 size-8 items-center justify-center shrink-0',
        onPress && '-my-2.5'
      )}
    >
      <Icon className="text-muted-foreground" icon={Plus} />
    </View>
  ) : null;

  if (!onPress) {
    return (
      <View
        className={cn(
          'h-auto min-h-10 w-full px-3 py-1 rounded-none items-center justify-start flex-row',
          className
        )}
      >
        {content}
        {actionIcon}
      </View>
    );
  }

  return (
    <Button
      disabled={disabled}
      onPress={onPress}
      size="sm"
      variant="ghost"
      wrapperClassName="w-full rounded-none border-continuous"
      className={cn(
        'h-auto min-h-10 px-3 py-2.5 rounded-none items-center justify-start',
        className
      )}
    >
      {content}
      {actionIcon}
    </Button>
  );
};
