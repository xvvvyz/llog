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
      <View className="mx-auto w-full max-w-md items-center p-8">
        {url && (
          <View className="bg-contrast-foreground rounded-lg p-4">
            <QRCode value={url} size={180} />
          </View>
        )}
      </View>
    </Sheet>
  );
};
