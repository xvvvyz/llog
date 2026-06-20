import { getInviteLinkSheetPayload } from '@/features/invites/lib/sheet';
import { useCopy } from '@/hooks/use-copy';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import * as inputGroup from '@/ui/input-group';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { Check, Copy, LinkBreak } from 'phosphor-react-native';
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

const InviteLinkSheetActions = ({
  inviteId,
  onDeleted,
  teamId,
  url,
}: {
  inviteId: string;
  onDeleted?: (inviteId: string) => void;
  teamId: string;
  url: string;
}) => {
  const sheetManager = useSheetManager();
  const { copied, copy } = useCopy();

  const handleInvalidateInvite = React.useCallback(() => {
    sheetManager.open('invite-link-delete', undefined, undefined, {
      inviteId,
      onDeleted,
      teamId,
    });
  }, [inviteId, onDeleted, sheetManager, teamId]);

  const handleCopyInvite = React.useCallback(async () => {
    try {
      await copy(url);
    } catch {
      // noop
    }
  }, [copy, url]);

  return (
    <inputGroup.InputGroup>
      <Button
        className="flex-1 h-full min-w-0 px-3 rounded-none gap-3 justify-start"
        onPress={handleCopyInvite}
        size="sm"
        variant="ghost"
        wrapperClassName="h-full flex-1 min-w-0 rounded-none"
      >
        <Text
          className="flex-1 min-w-0 font-normal text-base text-foreground native:leading-5 native:text-base"
          numberOfLines={1}
        >
          {url}
        </Text>
        <Icon className="text-muted-foreground" icon={copied ? Check : Copy} />
      </Button>
      <Button
        accessibilityLabel="Invalidate invite link"
        className="h-full w-10 rounded-none"
        onPress={handleInvalidateInvite}
        size="icon-sm"
        variant="ghost"
        wrapperClassName="h-full shrink-0 rounded-none border-l border-border-secondary"
      >
        <Icon icon={LinkBreak} />
      </Button>
    </inputGroup.InputGroup>
  );
};

export const InviteLinkSheet = () => {
  const sheetManager = useSheetManager();
  const url = sheetManager.getId('invite-link');

  const payload = getInviteLinkSheetPayload(
    sheetManager.getPayload('invite-link')
  );

  const [qrSize, setQrSize] = React.useState(0);

  const handleDismiss = React.useCallback(() => {
    sheetManager.close('invite-link');
  }, [sheetManager]);

  const handleQrLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextSize = Math.floor(event.nativeEvent.layout.width);

    setQrSize((currentSize) =>
      currentSize === nextSize ? currentSize : nextSize
    );
  }, []);

  return (
    <Sheet
      onDismiss={handleDismiss}
      open={sheetManager.isOpen('invite-link')}
      portalName="invite-link"
      width="narrow"
    >
      <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 gap-3 items-center md:p-8">
        {url && (
          <View className="w-full gap-3">
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
            {payload && (
              <InviteLinkSheetActions
                inviteId={payload.inviteId}
                onDeleted={payload.onDeleted}
                teamId={payload.teamId}
                url={url}
              />
            )}
          </View>
        )}
        <Button
          onPress={handleDismiss}
          variant="secondary"
          wrapperClassName="mt-5 w-full"
        >
          <Text>Close</Text>
        </Button>
      </View>
    </Sheet>
  );
};
