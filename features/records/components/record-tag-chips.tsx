import * as lookup from '@/features/search/lib/lookup';
import { TagChipList } from '@/features/tags/components/tag-chip-list';
import type { Tag } from '@/features/tags/types/tag';
import { cn } from '@/lib/cn';
import { Href } from 'expo-router';
import * as React from 'react';

type RecordTagChip = Partial<Pick<Tag, 'order'>> &
  Pick<Tag, 'color' | 'id' | 'name'>;

export const RecordTagChips = ({
  chipClassName,
  className,
  linkToSearch = false,
  logName,
  tags,
}: {
  chipClassName?: string;
  className?: string;
  linkToSearch?: boolean;
  logName?: string;
  tags?: RecordTagChip[];
}) => {
  const visibleTags = (tags ?? []).filter((tag) => !!tag.name);

  const getTagHref = React.useCallback(
    (tag: RecordTagChip): Href => {
      return lookup.getLookupHref(
        lookup.getRecordTagSearchQuery({ log: { name: logName }, tag })
      );
    },
    [logName]
  );

  return (
    <TagChipList
      chipClassName={chipClassName}
      className={cn('max-w-full justify-end gap-1', className)}
      getTagHref={linkToSearch ? getTagHref : undefined}
      maxVisible={visibleTags.length}
      tags={visibleTags}
    />
  );
};
