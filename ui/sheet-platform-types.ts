import type { StyleProp, ViewStyle } from 'react-native';

export type SheetPlatformLayoutOptions = {
  activeElementRootRef?: { current: unknown };
  bottomInset: number;
  keyboardAvoidingEnabled?: boolean;
  open: boolean;
  windowHeight: number;
};

export type SheetPlatformLayout = {
  bottomSpacerStyle: StyleProp<ViewStyle>;
  keyboardAvoidingStyle?: StyleProp<ViewStyle>;
  keyboardBackdropStyle?: StyleProp<ViewStyle>;
  viewportHeight: number;
};
