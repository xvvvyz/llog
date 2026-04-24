import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { animation } from '@/lib/animation';
import { cn } from '@/lib/cn';
import { Loading } from '@/ui/loading';
import { useSheetPlatformLayout } from '@/ui/sheet-platform';
import { Portal } from '@rn-primitives/portal';
import * as React from 'react';

import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
} from 'react-native-reanimated';

export const Sheet = ({
  children,
  className,
  constrainToViewport,
  fullHeight,
  loading,
  onDismiss,
  open,
  portalName,
  topInset = 24,
}: {
  children: React.ReactNode;
  className?: string;
  constrainToViewport?: boolean;
  fullHeight?: boolean;
  loading?: boolean;
  onDismiss: () => void;
  open: boolean;
  portalName: string;
  topInset?: number;
}) => {
  const inset = useSafeAreaInsets();
  const windowDimensions = useWindowDimensions();

  const platformLayout = useSheetPlatformLayout({
    bottomInset: inset.bottom,
    open,
    windowHeight: windowDimensions.height,
  });

  const availableHeight = Math.max(
    1,
    Math.round(
      platformLayout.viewportHeight - inset.top - topInset - inset.bottom
    )
  );

  const heightStyle = fullHeight
    ? { height: availableHeight }
    : constrainToViewport
      ? { maxHeight: availableHeight }
      : undefined;

  return (
    <Portal name={portalName}>
      <Modal
        focusable={false}
        onRequestClose={onDismiss}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={open}
      >
        <Animated.View
          className="absolute inset-0"
          entering={animation(FadeInDown)}
          exiting={animation(FadeOutDown)}
        >
          <Animated.View
            className="absolute inset-0 bg-background/90"
            entering={animation(FadeIn)}
            exiting={animation(FadeOut)}
          >
            <Pressable
              className="h-full w-full cursor-default"
              onPress={onDismiss}
            />
          </Animated.View>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="absolute inset-0 justify-end"
            pointerEvents="box-none"
            style={platformLayout.keyboardAvoidingStyle}
          >
            <View
              className={cn(
                'border-border-secondary bg-popover overflow-hidden rounded-t-4xl border-x border-t',
                (fullHeight || constrainToViewport) && 'min-h-0',
                className
              )}
              style={StyleSheet.flatten([
                { borderCurve: 'continuous' },
                heightStyle,
              ])}
            >
              {children}
              {loading && (
                <Animated.View
                  className="absolute inset-0 z-10 rounded-t-4xl bg-popover"
                  exiting={animation(FadeOut)}
                >
                  <Loading className="bg-popover" />
                </Animated.View>
              )}
            </View>
            <View
              className="border-border border-x bg-popover"
              style={platformLayout.bottomSpacerStyle}
            />
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </Portal>
  );
};
