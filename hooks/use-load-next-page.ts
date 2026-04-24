import * as React from 'react';

export const useLoadNextPage = ({
  canLoadNextPage,
  itemCount,
  loadNextPage,
}: {
  canLoadNextPage: boolean;
  itemCount: number;
  loadNextPage: () => void;
}) => {
  const requestedCountRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!canLoadNextPage) {
      requestedCountRef.current = null;
      return;
    }

    if (
      requestedCountRef.current != null &&
      itemCount > requestedCountRef.current
    ) {
      requestedCountRef.current = null;
    }
  }, [canLoadNextPage, itemCount]);

  return React.useCallback(() => {
    if (!canLoadNextPage) return;
    if (requestedCountRef.current === itemCount) return;
    requestedCountRef.current = itemCount;
    loadNextPage();
  }, [canLoadNextPage, itemCount, loadNextPage]);
};
