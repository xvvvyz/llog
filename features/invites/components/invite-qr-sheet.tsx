import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Sheet } from '@/ui/sheet';
import * as React from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export const InviteQrSheet = () => {
  const sheetManager = useSheetManager();
  const url = sheetManager.getId('invite-qr');

  const handleDismiss = React.useCallback(() => {
    sheetManager.close('invite-qr');
  }, [sheetManager]);

  return (
    <Sheet
      onDismiss={handleDismiss}
      open={sheetManager.isOpen('invite-qr')}
      portalName="invite-qr"
    >
      <View className="mx-auto max-w-md w-full p-8 items-center">
        {url && (
          <View className="p-4 rounded-lg bg-contrast-foreground">
            <QRCode size={180} value={url} />
          </View>
        )}
      </View>
    </Sheet>
  );
};
