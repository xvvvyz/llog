import * as React from 'react';

export const useFrameDelayedTrue = ({
  resetKey,
  value,
}: {
  resetKey?: string;
  value: boolean;
}) => {
  const [readyKey, setReadyKey] = React.useState<string>();

  React.useEffect(() => {
    if (!value || !resetKey) {
      setReadyKey(undefined);
      return;
    }

    const frame = requestAnimationFrame(() => {
      setReadyKey(resetKey);
    });

    return () => cancelAnimationFrame(frame);
  }, [resetKey, value]);

  return !!resetKey && value && readyKey === resetKey;
};
