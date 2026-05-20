import { useWebSheetScrollLock } from '@/ui/sheet-platform-web-scroll-lock';
import { useWebSheetVisualViewport } from '@/ui/sheet-platform-web-viewport';
import type * as sheetPlatformTypes from '@/ui/sheet-platform-types';

const WEB_SHEET_BOTTOM_OVERSCAN = 128;

export const useSheetPlatformLayout = ({
  bottomInset,
  keyboardAvoidingEnabled = true,
  open,
  windowHeight,
}: sheetPlatformTypes.SheetPlatformLayoutOptions): sheetPlatformTypes.SheetPlatformLayout => {
  const webViewport = useWebSheetVisualViewport(
    open && keyboardAvoidingEnabled
  );

  useWebSheetScrollLock(open);

  return {
    bottomSpacerStyle: {
      marginBottom: -WEB_SHEET_BOTTOM_OVERSCAN,
      paddingBottom: bottomInset + WEB_SHEET_BOTTOM_OVERSCAN,
    },
    keyboardAvoidingStyle: webViewport.bottomInset
      ? { bottom: webViewport.bottomInset }
      : undefined,
    viewportHeight: webViewport.height ?? windowHeight,
  };
};
