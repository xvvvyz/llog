import { cn } from '@/lib/cn';
import { Text } from '@/ui/text';
import { View } from 'react-native';

export type TagChipVariant = 'contrast' | 'secondary';

const chipVariantClasses: Record<TagChipVariant, string> = {
  contrast: 'bg-contrast-background/10',
  secondary: 'bg-secondary',
};

const textVariantClasses: Record<TagChipVariant, string> = {
  contrast: 'text-contrast-foreground/90',
  secondary: 'text-muted-foreground',
};

export const TagChip = ({
  className,
  name,
  textClassName,
  variant = 'secondary',
}: {
  className?: string;
  name: string;
  textClassName?: string;
  variant?: TagChipVariant;
}) => (
  <View
    className={cn(
      'max-w-full rounded-full px-1.5 py-0.5 border-continuous',
      chipVariantClasses[variant],
      className
    )}
  >
    <Text
      className={cn('text-xs', textVariantClasses[variant], textClassName)}
      numberOfLines={1}
    >
      {name}
    </Text>
  </View>
);
