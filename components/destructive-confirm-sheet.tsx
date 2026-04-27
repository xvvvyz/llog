import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

export const DestructiveConfirmSheet = ({
  isPending,
  onConfirm,
  onDismiss,
  open,
  portalName,
  title,
}: {
  isPending: boolean;
  onConfirm: () => Promise<void>;
  onDismiss: () => void;
  open: boolean;
  portalName: string;
  title: string;
}) => {
  return (
    <Sheet onDismiss={onDismiss} open={open} portalName={portalName}>
      <View className="mx-auto max-w-md w-full p-8">
        <Text className="text-2xl text-center">{title}</Text>
        <Button
          disabled={isPending}
          onPress={onConfirm}
          variant="destructive"
          wrapperClassName="mt-12"
        >
          {isPending ? (
            <Spinner color={UI.light.contrastForeground} />
          ) : (
            <Text>Delete</Text>
          )}
        </Button>
        <Button
          disabled={isPending}
          onPress={onDismiss}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
