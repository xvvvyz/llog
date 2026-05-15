import { TagChipList } from '@/features/tags/components/tag-chip-list';
import type { Tag } from '@/features/tags/types/tag';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Plus } from 'phosphor-react-native';

type AddTagsInputTag = Pick<Tag, 'color' | 'id' | 'name'>;

export const AddTagsInput = ({
  className,
  disabled,
  onPress,
  placeholder = 'Add tags',
  tags,
}: {
  className?: string;
  disabled?: boolean;
  onPress: () => void;
  placeholder?: string;
  tags?: AddTagsInputTag[];
}) => {
  const visibleTags = (tags ?? []).filter((tag) => !!tag.name);

  return (
    <Button
      disabled={disabled}
      onPress={onPress}
      size="sm"
      variant="ghost"
      wrapperClassName="w-full rounded-none border-continuous"
      className={cn(
        'h-auto min-h-10 px-3 py-2 rounded-none items-center justify-start',
        className
      )}
    >
      {visibleTags.length > 0 ? (
        <TagChipList
          chipClassName="light:bg-muted"
          className="flex-1 gap-1"
          maxVisible={visibleTags.length}
          tags={visibleTags}
        />
      ) : (
        <Text className="flex-1 font-normal text-muted-foreground">
          {placeholder}
        </Text>
      )}
      <Icon
        className="-mr-0.5 ml-2 text-muted-foreground shrink-0"
        icon={Plus}
      />
    </Button>
  );
};
