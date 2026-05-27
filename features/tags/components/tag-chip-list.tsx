import { TagChip } from '@/features/tags/components/tag-chip';
import type { Tag } from '@/features/tags/types/tag';
import { cn } from '@/lib/cn';
import { Href, Link } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

type TagChipListTag = Pick<Tag, 'color' | 'id'> & { name?: string | null };

const renderChip = ({
  chip,
  href,
  key,
}: {
  chip: React.ReactElement;
  href?: Href;
  key: string;
}) =>
  href ? (
    <Link key={key} asChild href={href}>
      {chip}
    </Link>
  ) : (
    <View key={key} className="max-w-full min-w-0">
      {chip}
    </View>
  );

export const TagChipList = ({
  chipClassName,
  className,
  getMoreHref,
  getTagHref,
  maxVisible = 2,
  onTagPress,
  showEmpty = false,
  tags,
  textClassName,
}: {
  chipClassName?: string;
  className?: string;
  getMoreHref?: (tags: (TagChipListTag & { name: string })[]) => Href;
  getTagHref?: (tag: TagChipListTag & { name: string }) => Href;
  maxVisible?: number;
  onTagPress?: (tag: TagChipListTag & { name: string }) => void;
  showEmpty?: boolean;
  tags?: TagChipListTag[];
  textClassName?: string;
}) => {
  const displayTags = (tags ?? []).filter(
    (tag): tag is TagChipListTag & { name: string } => !!tag.name
  );

  const visibleTags = displayTags.slice(0, maxVisible);
  const remainingTags = displayTags.slice(maxVisible);
  const remainingTagCount = remainingTags.length;
  if (!visibleTags.length && !showEmpty) return null;

  return (
    <View
      className={cn('flex-row flex-wrap', className)}
      style={{ pointerEvents: 'box-none' }}
    >
      {visibleTags.map((tag) => {
        const chip = (
          <TagChip
            className={chipClassName}
            color={tag.color}
            name={tag.name}
            onPress={onTagPress ? () => onTagPress(tag) : undefined}
            showColorAccent
            textClassName={textClassName}
          />
        );

        const href = getTagHref?.(tag);
        return renderChip({ chip, href, key: tag.id });
      })}
      {remainingTagCount > 0 &&
        renderChip({
          chip: (
            <TagChip
              className={chipClassName}
              name={`+${remainingTagCount} more`}
              textClassName={textClassName}
            />
          ),
          href: getMoreHref?.(remainingTags),
          key: 'more',
        })}
    </View>
  );
};
