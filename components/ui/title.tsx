import { Text } from '@/components/ui/text';
import { cn } from '@/utilities/ui/utils';
import { type ReactNode } from 'react';

export const Title = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <Text
      className={cn(
        // full width to prevent dynamic header titles from being cut off.
        // requires the header to have both left and right icons or neither.
        // https://github.com/react-navigation/react-navigation/issues/12502
        'android:text-lg w-full text-center font-medium web:px-3 md:px-4 md:text-xl',
        className
      )}
      numberOfLines={1}
    >
      {children}
    </Text>
  );
};
