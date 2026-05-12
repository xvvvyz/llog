import { TagChipList } from '@/features/tags/components/tag-chip-list';
import type { Tag } from '@/features/tags/types/tag';
import { cn } from '@/lib/cn';

type RecordTagChip = Partial<Pick<Tag, 'order'>> &
  Pick<Tag, 'color' | 'id' | 'name'>;

export const RecordTagChips = ({
  chipClassName,
  className,
  tags,
}: {
  chipClassName?: string;
  className?: string;
  tags?: RecordTagChip[];
}) => {
  const visibleTags = (tags ?? []).filter((tag) => !!tag.name);

  return (
    <TagChipList
      chipClassName={chipClassName}
      className={cn('max-w-full justify-end gap-1', className)}
      maxVisible={visibleTags.length}
      tags={visibleTags}
    />
  );
};
