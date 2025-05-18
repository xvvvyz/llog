import { Text } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { type ReactNode } from 'react';

export const HeaderTitle = ({
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
        'android:text-lg w-full px-4 py-0.5 text-center font-medium leading-none web:px-8',
        className
      )}
      numberOfLines={1}
    >
      {children}
    </Text>
  );
};
