import { useHeaderHeight as useHeaderHeightPrimative } from '@react-navigation/elements';
import { useMemo } from 'react';

export const useHeaderHeight = () => {
  const originalHeight = useHeaderHeightPrimative();

  // only return the original height, what comes after is wrong on android
  // https://github.com/react-navigation/react-navigation/issues/12545
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => originalHeight, []);
};
