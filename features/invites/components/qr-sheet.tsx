import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import * as React from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { withUniwind } from 'uniwind';

const StyledQRCode = withUniwind(QRCode, {
  backgroundColor: {
    fromClassName: 'backgroundColorClassName',
    styleProperty: 'backgroundColor',
  },
  color: { fromClassName: 'colorClassName', styleProperty: 'color' },
});

export const InviteQrSheet = () => {
  const sheetManager = useSheetManager();
  const url = sheetManager.getId('invite-qr');
  const [qrSize, setQrSize] = React.useState(0);

  const handleDismiss = React.useCallback(() => {
    sheetManager.close('invite-qr');
  }, [sheetManager]);

  const handleQrLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextSize = Math.floor(event.nativeEvent.layout.width);

    setQrSize((currentSize) =>
      currentSize === nextSize ? currentSize : nextSize
    );
  }, []);

  return (
    <Sheet
      className="md:max-w-sm"
      onDismiss={handleDismiss}
      open={sheetManager.isOpen('invite-qr')}
      portalName="invite-qr"
    >
      <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 items-center md:p-8">
        {url && (
          <View className="w-full p-4 border-border-secondary border-continuous rounded-xl bg-secondary border">
            <View
              className="aspect-square w-full items-center justify-center"
              onLayout={handleQrLayout}
            >
              {qrSize > 0 && (
                <StyledQRCode
                  backgroundColorClassName="bg-transparent"
                  colorClassName="text-foreground"
                  size={qrSize}
                  value={url}
                />
              )}
            </View>
          </View>
        )}
        <Button
          onPress={handleDismiss}
          variant="secondary"
          wrapperClassName="mt-6 w-full"
        >
          <Text>Close</Text>
        </Button>
      </View>
    </Sheet>
  );
};
