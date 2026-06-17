import { cn } from '@/lib/cn';
import { KeyboardDismissLayer } from '@/ui/keyboard-dismiss-layer';
import * as React from 'react';
import { Platform, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

type KeyboardAwareScrollViewProps = React.ComponentPropsWithoutRef<
  typeof KeyboardAwareScrollView
>;

type KeyboardAwareScreenProps = React.ComponentPropsWithoutRef<typeof View> & {
  bottomOffset?: number;
  contentContainerClassName?: string;
  dismissKeyboardOnPress?: boolean;
  extraKeyboardSpace?: number;
  keyboardDismissMode?: KeyboardAwareScrollViewProps['keyboardDismissMode'];
  keyboardShouldPersistTaps?: KeyboardAwareScrollViewProps['keyboardShouldPersistTaps'];
  scrollClassName?: string;
};

export const KeyboardAwareScreen = ({
  bottomOffset = 24,
  children,
  className,
  contentContainerClassName,
  dismissKeyboardOnPress = true,
  extraKeyboardSpace,
  keyboardDismissMode = Platform.OS === 'web' ? 'none' : 'on-drag',
  keyboardShouldPersistTaps = 'handled',
  pointerEvents = 'box-none',
  scrollClassName,
  ...props
}: KeyboardAwareScreenProps) => {
  const content = (
    <View
      {...props}
      className={cn('flex-1', className)}
      pointerEvents={pointerEvents}
    >
      {dismissKeyboardOnPress && Platform.OS !== 'web' && (
        <KeyboardDismissLayer />
      )}
      {children}
    </View>
  );

  if (Platform.OS === 'web') return content;

  return (
    <KeyboardAwareScrollView
      bottomOffset={bottomOffset}
      className={cn('flex-1', scrollClassName)}
      contentContainerClassName={cn('flex-grow', contentContainerClassName)}
      extraKeyboardSpace={extraKeyboardSpace}
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </KeyboardAwareScrollView>
  );
};
