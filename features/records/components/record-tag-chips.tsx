import { TagChipList } from '@/features/tags/components/tag-chip-list';
import type { Tag } from '@/features/tags/types/tag';
import { cn } from '@/lib/cn';

type RecordTagChip = {
  color: Tag['color'];
  id: Tag['id'];
  name?: string | null;
  order?: Tag['order'];
};

export const RecordTagChips = ({
  chipClassName,
  className,
  tags,
}: {
  chipClassName?: string;
  className?: string;
  tags?: RecordTagChip[];
}) => {
  const orderedTags = [...(tags ?? [])]
    .filter((tag) => !!tag.name)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <TagChipList
      chipClassName={chipClassName}
      className={cn('max-w-full justify-end gap-1', className)}
      maxVisible={orderedTags.length}
      tags={orderedTags}
    />
  );
};
