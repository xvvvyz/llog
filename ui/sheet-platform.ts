import type { StyleProp, ViewStyle } from 'react-native';

type SheetPlatformLayoutOptions = {
  activeElementRootRef?: { current: unknown };
  bottomInset: number;
  keyboardAvoidingEnabled?: boolean;
  open: boolean;
  windowHeight: number;
};

type SheetPlatformLayout = {
  bottomSpacerStyle: StyleProp<ViewStyle>;
  keyboardAvoidingStyle?: StyleProp<ViewStyle>;
  viewportHeight: number;
};

export const useSheetPlatformLayout = ({
  bottomInset,
  windowHeight,
}: SheetPlatformLayoutOptions): SheetPlatformLayout => ({
  bottomSpacerStyle: { height: bottomInset },
  viewportHeight: windowHeight,
});
