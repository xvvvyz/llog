import type { Tag } from '@/features/tags/types/tag';
import { cn } from '@/lib/cn';
import { View } from 'react-native';

import {
  TagChip,
  type TagChipVariant,
} from '@/features/tags/components/tag-chip';

type TagChipListTag = Pick<Tag, 'id'> & { name?: string | null };

export const TagChipList = ({
  className,
  maxVisible = 2,
  showEmpty = false,
  tags,
  variant,
}: {
  className?: string;
  maxVisible?: number;
  showEmpty?: boolean;
  tags?: TagChipListTag[];
  variant?: TagChipVariant;
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
        <TagChip key={tag.id} name={tag.name} variant={variant} />
      ))}
      {remainingTagCount > 0 && (
        <TagChip name={`+${remainingTagCount} more`} variant={variant} />
      )}
    </View>
  );
};
