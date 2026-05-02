import * as React from 'react';

export const useLoadNextPage = ({
  canLoadNextPage,
  itemCount,
  loadNextPage,
  requestKey,
}: {
  canLoadNextPage: boolean;
  itemCount: number;
  loadNextPage: () => void;
  requestKey?: unknown;
}) => {
  const requestedRef = React.useRef<{
    itemCount: number;
    requestKey: unknown;
  } | null>(null);

  React.useEffect(() => {
    if (!canLoadNextPage) {
      requestedRef.current = null;
      return;
    }

    if (
      requestedRef.current != null &&
      itemCount > requestedRef.current.itemCount
    ) {
      requestedRef.current = null;
    }
  }, [canLoadNextPage, itemCount]);

  return React.useCallback(() => {
    if (!canLoadNextPage) return;

    if (
      requestedRef.current?.itemCount === itemCount &&
      Object.is(requestedRef.current.requestKey, requestKey)
    ) {
      return;
    }

    requestedRef.current = { itemCount, requestKey };
    loadNextPage();
  }, [canLoadNextPage, itemCount, loadNextPage, requestKey]);
};
