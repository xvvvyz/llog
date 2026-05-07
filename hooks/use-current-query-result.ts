import * as React from 'react';

export const useCurrentQueryResult = (
  queryKey: string | undefined,
  data: unknown
) => {
  const previousDataRef = React.useRef(data);
  const queryKeyRef = React.useRef(queryKey);
  const previousKeyDataRef = React.useRef<unknown>(undefined);
  const [currentQueryKey, setCurrentQueryKey] = React.useState<string>();

  if (queryKeyRef.current !== queryKey) {
    queryKeyRef.current = queryKey;
    previousKeyDataRef.current = previousDataRef.current;
  }

  React.useEffect(() => {
    previousDataRef.current = data;
  }, [data]);

  React.useEffect(() => {
    if (!queryKey) {
      setCurrentQueryKey(queryKey);
      return;
    }

    if (data === undefined || Object.is(previousKeyDataRef.current, data)) {
      return;
    }

    setCurrentQueryKey(queryKey);
  }, [data, queryKey]);

  return !queryKey || currentQueryKey === queryKey;
};
