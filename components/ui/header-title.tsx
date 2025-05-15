import { Text } from '@/components/ui/text';
import { type ReactNode } from 'react';

export const HeaderTitle = ({ children }: { children: ReactNode }) => {
  return (
    <Text className="w-28 truncate py-0.5 text-center text-lg font-medium leading-none 2xs:w-40 xs:w-52 sm:w-64 md:w-80">
      {children}
    </Text>
  );
};
