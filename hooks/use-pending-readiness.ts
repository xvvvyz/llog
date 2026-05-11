import * as React from 'react';

export const usePendingValue = <T>() => {
  const [pendingValue, setPendingValue] = React.useState<T | null>(null);

  const begin = React.useCallback((value: T) => {
    setPendingValue(value);
  }, []);

  const clear = React.useCallback(() => {
    setPendingValue(null);
  }, []);

  return React.useMemo(
    () => ({ begin, clear, isPending: pendingValue !== null, pendingValue }),
    [begin, clear, pendingValue]
  );
};

export const useOnPendingReady = <T>({
  clear,
  isReady,
  onReady,
  pendingValue,
}: {
  clear: () => void;
  isReady: (value: T) => boolean;
  onReady?: (value: T) => void;
  pendingValue: T | null;
}) => {
  React.useEffect(() => {
    if (pendingValue === null || !isReady(pendingValue)) return;
    const readyValue = pendingValue;
    clear();
    onReady?.(readyValue);
  }, [clear, isReady, onReady, pendingValue]);
};
