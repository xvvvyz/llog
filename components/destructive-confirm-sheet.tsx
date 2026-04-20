import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

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
      <View className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">{title}</Text>
        <Button
          disabled={isPending}
          onPress={onConfirm}
          variant="destructive"
          wrapperClassName="mt-12"
        >
          {isPending ? (
            <ActivityIndicator color="white" size="small" />
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
