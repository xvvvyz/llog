import { useEffect } from 'react';
import { Keyboard } from 'react-native';

export const useAutoDismissKeyboard = () => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(Keyboard.dismiss, []);
};
