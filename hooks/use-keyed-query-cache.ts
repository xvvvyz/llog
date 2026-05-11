import * as React from 'react';

export const useKeyedQueryCache = <T>({
  emptyValue,
  queryKey,
  value,
}: {
  emptyValue: T;
  queryKey?: string;
  value?: T;
}) => {
  const cacheRef = React.useRef<{
    hasReceived: boolean;
    key?: string;
    value: T;
  }>({ hasReceived: false, value: emptyValue });

  if (!queryKey) {
    cacheRef.current = { hasReceived: false, value: emptyValue };
  } else if (cacheRef.current.key !== queryKey) {
    cacheRef.current = { hasReceived: false, key: queryKey, value: emptyValue };
  }

  if (queryKey && value !== undefined) {
    cacheRef.current = { hasReceived: true, key: queryKey, value };
  }

  return {
    hasSnapshot:
      !queryKey ||
      (cacheRef.current.key === queryKey && cacheRef.current.hasReceived),
    value: queryKey ? cacheRef.current.value : emptyValue,
  };
};
