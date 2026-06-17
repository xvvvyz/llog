import { dismissKeyboard } from '@/lib/keyboard';
import { Pressable } from 'react-native';

const handleDismissPress = () => dismissKeyboard();

export const KeyboardDismissLayer = ({
  onPress = handleDismissPress,
}: {
  onPress?: () => void;
}) => (
  <Pressable
    accessibilityElementsHidden
    accessible={false}
    className="absolute inset-0"
    importantForAccessibility="no"
    onPress={onPress}
  />
);
