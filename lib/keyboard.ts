import { Keyboard, Platform } from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';

export const dismissKeyboard = ({
  immediate = false,
}: { immediate?: boolean } = {}) => {
  if (Platform.OS === 'web' || !immediate) {
    Keyboard.dismiss();
    return;
  }

  void KeyboardController.dismiss({ animated: false }).catch(() => {
    Keyboard.dismiss();
  });
};
