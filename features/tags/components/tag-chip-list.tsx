import { TagChip } from '@/features/tags/components/tag-chip';
import type { Tag } from '@/features/tags/types/tag';
import { cn } from '@/lib/cn';
import { View } from 'react-native';

type TagChipListTag = Pick<Tag, 'id'> & {
  color?: number | null;
  name?: string | null;
};

export const TagChipList = ({
  chipClassName,
  className,
  fallbackAccentColor,
  maxVisible = 2,
  showEmpty = false,
  tags,
  textClassName,
}: {
  chipClassName?: string;
  className?: string;
  fallbackAccentColor?: string;
  maxVisible?: number;
  showEmpty?: boolean;
  tags?: TagChipListTag[];
  textClassName?: string;
}) => {
  const displayTags = (tags ?? []).filter(
    (tag): tag is TagChipListTag & { name: string } => !!tag.name
  );

  const visibleTags = displayTags.slice(0, maxVisible);
  const remainingTagCount = displayTags.length - visibleTags.length;
  if (!visibleTags.length && !showEmpty) return null;

  return (
    <View className={cn('flex-row flex-wrap', className)}>
      {visibleTags.map((tag) => (
        <TagChip
          key={tag.id}
          className={chipClassName}
          color={tag.color}
          fallbackAccentColor={fallbackAccentColor}
          name={tag.name}
          showColorAccent
          textClassName={textClassName}
        />
      ))}
      {remainingTagCount > 0 && (
        <TagChip
          className={chipClassName}
          name={`+${remainingTagCount} more`}
          textClassName={textClassName}
        />
      )}
    </View>
  );
};
