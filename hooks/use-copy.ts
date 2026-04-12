import * as Clipboard from 'expo-clipboard';
import * as React from 'react';

export const useCopy = () => {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const copy = React.useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    clearTimeout(timer.current);
    setCopied(true);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  return { copy, copied };
};
