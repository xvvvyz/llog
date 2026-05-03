import { TagChipList } from '@/features/tags/components/tag-chip-list';
import type { Tag } from '@/features/tags/types/tag';
import { cn } from '@/lib/cn';

export const RecordTagChips = ({
  className,
  tags,
}: {
  className?: string;
  tags?: Tag[];
}) => {
  const orderedTags = [...(tags ?? [])]
    .filter((tag) => !!tag.name)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <TagChipList
      className={cn('max-w-full justify-end gap-1', className)}
      maxVisible={orderedTags.length}
      tags={orderedTags}
    />
  );
};
