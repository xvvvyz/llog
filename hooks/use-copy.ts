import * as Clipboard from 'expo-clipboard';
import { useCallback, useRef, useState } from 'react';

export const useCopy = () => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const copy = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    clearTimeout(timer.current);
    setCopied(true);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  return { copy, copied };
};
