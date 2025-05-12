import { Text } from '@/components/ui/text';
import * as React from 'react';

export const HeaderTitle = ({ children }: { children: React.ReactNode }) => {
  return (
    <Text className="max-w-28 truncate py-0.5 text-lg font-medium leading-none 2xs:max-w-40 xs:max-w-52 sm:max-w-64 md:max-w-80">
      {children}
    </Text>
  );
};
