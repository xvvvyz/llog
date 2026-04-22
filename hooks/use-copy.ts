import * as Clipboard from 'expo-clipboard';
import * as React from 'react';
import { Platform } from 'react-native';

type CopyValue = string | Promise<string> | (() => string | Promise<string>);

const resolveCopyValue = async (value: CopyValue) => {
  if (typeof value === 'function') return value();
  return value;
};

const copyOnWeb = async (value: CopyValue) => {
  const clipboard = globalThis.navigator?.clipboard;
  const textPromise = resolveCopyValue(value);

  if (clipboard?.write && typeof globalThis.ClipboardItem !== 'undefined') {
    await clipboard.write([
      new globalThis.ClipboardItem({
        'text/plain': textPromise.then(
          (text) => new Blob([text], { type: 'text/plain' })
        ),
      }),
    ]);
    return;
  }

  if (clipboard?.writeText) {
    await clipboard.writeText(await textPromise);
    return;
  }

  await Clipboard.setStringAsync(await textPromise);
};

export const useCopy = () => {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  const copy = React.useCallback(async (value: CopyValue) => {
    if (Platform.OS === 'web') await copyOnWeb(value);
    else await Clipboard.setStringAsync(await resolveCopyValue(value));

    clearTimeout(timer.current);
    setCopied(true);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  return { copy, copied };
};
