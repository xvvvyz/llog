import * as React from 'react';

export const useDelayedTrue = (
  value: boolean,
  { delayMs = 200, resetKey }: { delayMs?: number; resetKey?: unknown } = {}
) => {
  const [delayedValue, setDelayedValue] = React.useState(false);

  React.useEffect(() => {
    if (!value) {
      setDelayedValue(false);
      return;
    }

    setDelayedValue(false);

    const timeout = setTimeout(() => {
      setDelayedValue(true);
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [delayMs, resetKey, value]);

  return delayedValue;
};
