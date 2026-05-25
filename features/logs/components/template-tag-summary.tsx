import type { Tag } from '@/features/tags/types/tag';
import { cn } from '@/lib/cn';
import { getSpectrumBackgroundClassName } from '@/theme/spectrum-class-names';
import { Text } from '@/ui/text';
import { View } from 'react-native';

type TemplateTagSummaryTag = Pick<Tag, 'color' | 'id' | 'order'> & {
  name?: string | null;
};

export const TemplateTagSummary = ({
  className,
  tags,
}: {
  className?: string;
  tags?: TemplateTagSummaryTag[];
}) => {
  const displayTags = (tags ?? []).filter(
    (tag): tag is TemplateTagSummaryTag & { name: string } => !!tag.name
  );

  const primaryTag = [...displayTags].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  )[0];

  if (!primaryTag) return null;

  return (
    <View
      className={cn(
        'min-w-0 shrink-0 flex-row items-center gap-1.5 overflow-hidden rounded-full bg-secondary px-1.5 py-0.5',
        className
      )}
    >
      <View
        className={cn(
          'size-2.5 rounded-full shrink-0',
          getSpectrumBackgroundClassName(primaryTag.color)
        )}
      />
      <Text
        className="min-w-0 font-normal text-muted-foreground text-xs shrink"
        numberOfLines={1}
      >
        {primaryTag.name}
      </Text>
    </View>
  );
};
