import * as React from 'react';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

// react-native-web's Appearance/useColorScheme path can miss the first
// prefers-color-scheme transition on mobile web, which leaves our app and the
// body background stuck on the old theme until a later change. We still rely
// on react-native-web for the web runtime, but theme detection is handled here
// with matchMedia directly to avoid that edge case.
const getSnapshot = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
};

const subscribe = (onStoreChange: () => void) => {
  if (typeof window === 'undefined') return () => {};
  const query = window.matchMedia(MEDIA_QUERY);

  const handleChange = () => {
    onStoreChange();
  };

  query.addEventListener('change', handleChange);

  return () => {
    query.removeEventListener('change', handleChange);
  };
};

export const useColorScheme = (): 'light' | 'dark' =>
  React.useSyncExternalStore(subscribe, getSnapshot, () => 'light');
