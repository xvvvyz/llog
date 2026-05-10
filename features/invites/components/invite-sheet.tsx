import { getInviteSheetPayload } from '@/features/invites/lib/sheet';
import { useCopy } from '@/hooks/use-copy';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { Check, Copy, LinkBreak } from 'phosphor-react-native';
import * as React from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { withUniwind } from 'uniwind';
import * as inputGroup from '@/ui/input-group';

const StyledQRCode = withUniwind(QRCode, {
  backgroundColor: {
    fromClassName: 'backgroundColorClassName',
    styleProperty: 'backgroundColor',
  },
  color: { fromClassName: 'colorClassName', styleProperty: 'color' },
});

export const InviteSheet = () => {
  const sheetManager = useSheetManager();
  const url = sheetManager.getId('invite');
  const payload = getInviteSheetPayload(sheetManager.getPayload('invite'));
  const [qrSize, setQrSize] = React.useState(0);
  const { copied, copy } = useCopy();

  const handleDismiss = React.useCallback(() => {
    sheetManager.close('invite');
  }, [sheetManager]);

  const handleQrLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextSize = Math.floor(event.nativeEvent.layout.width);

    setQrSize((currentSize) =>
      currentSize === nextSize ? currentSize : nextSize
    );
  }, []);

  const openInvalidateConfirm = React.useCallback(() => {
    if (!payload) return;
    sheetManager.open('invite-link-delete', undefined, undefined, payload);
  }, [payload, sheetManager]);

  return (
    <Sheet
      className="md:max-w-sm"
      onDismiss={handleDismiss}
      open={sheetManager.isOpen('invite')}
      portalName="invite"
    >
      <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 gap-8 items-center md:p-8">
        {url && (
          <View className="w-full gap-3">
            <View className="w-full p-3 border-border-secondary border-continuous rounded-xl bg-secondary border">
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
            <inputGroup.InputGroup className="w-full">
              <inputGroup.InputGroupInput editable={false} value={url} />
              <inputGroup.InputGroupButton onPress={() => copy(url)}>
                <Icon icon={copied ? Check : Copy} />
              </inputGroup.InputGroupButton>
              {payload && (
                <inputGroup.InputGroupButton
                  accessibilityLabel="Invalidate invite link"
                  onPress={openInvalidateConfirm}
                >
                  <Icon icon={LinkBreak} />
                </inputGroup.InputGroupButton>
              )}
            </inputGroup.InputGroup>
          </View>
        )}
        <Button
          onPress={handleDismiss}
          variant="secondary"
          wrapperClassName="w-full"
        >
          <Text>Close</Text>
        </Button>
      </View>
    </Sheet>
  );
};
