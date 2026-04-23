import type { StyleProp, ViewStyle } from 'react-native';

type SheetPlatformLayoutOptions = {
  bottomInset: number;
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
