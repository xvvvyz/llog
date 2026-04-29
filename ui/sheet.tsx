import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { animation } from '@/lib/animation';
import { cn } from '@/lib/cn';
import { Loading } from '@/ui/loading';
import { useSheetPlatformLayout } from '@/ui/sheet-platform';
import { useSheetStack, useSheetStackBackdrop } from '@/ui/sheet-stack';
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

export const SHEET_LAYERS = { route: 10, action: 20 } as const;

export const SheetBackdrop = () => {
  const backdrop = useSheetStackBackdrop();
  if (Platform.OS !== 'web' || !backdrop.open) return null;

  return (
    <Portal name="sheet-backdrop">
      <Animated.View
        className="fixed inset-0 bg-background/90"
        entering={animation(FadeIn)}
        exiting={animation(FadeOut)}
        style={{ zIndex: backdrop.layer }}
      >
        <Pressable
          className="h-full w-full cursor-default"
          onPress={backdrop.onDismiss}
        />
      </Animated.View>
    </Portal>
  );
};

export const Sheet = ({
  children,
  className,
  layer = SHEET_LAYERS.action,
  loading,
  onDismiss,
  open,
  portalName,
  topInset = 72,
}: {
  children: React.ReactNode;
  className?: string;
  layer?: number;
  loading?: boolean;
  onDismiss: () => void;
  open: boolean;
  portalName: string;
  topInset?: number;
}) => {
  const isWeb = Platform.OS === 'web';
  const inset = useSafeAreaInsets();
  const windowDimensions = useWindowDimensions();
  const sheetContentRef = React.useRef<React.ComponentRef<typeof View>>(null);
  const sheetStack = useSheetStack({ layer, onDismiss, open });

  const platformLayout = useSheetPlatformLayout({
    activeElementRootRef: sheetContentRef,
    bottomInset: inset.bottom,
    keyboardAvoidingEnabled: sheetStack.isTopSheet,
    open,
    windowHeight: windowDimensions.height,
  });

  const availableHeight = Math.max(
    1,
    Math.round(
      platformLayout.viewportHeight - inset.top - topInset - inset.bottom
    )
  );

  const heightStyle = { maxHeight: availableHeight };

  const sheet = (
    <Animated.View
      className="absolute inset-0"
      entering={animation(FadeInDown)}
      exiting={animation(FadeOutDown)}
      pointerEvents={isWeb ? 'box-none' : 'auto'}
    >
      {isWeb ? null : (
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
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="absolute inset-0 justify-end"
        pointerEvents="box-none"
        style={platformLayout.keyboardAvoidingStyle}
      >
        <View
          ref={sheetContentRef}
          className={cn(
            'border-border-secondary bg-popover min-h-0 overflow-hidden rounded-t-4xl border-x border-t',
            loading && 'min-h-32',
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
              className="absolute inset-0 z-10 py-8 rounded-t-4xl bg-popover"
              exiting={animation(FadeOut)}
            >
              <Loading className="p-0 bg-popover" />
            </Animated.View>
          )}
        </View>
        <View
          className="border-border border-x bg-popover"
          style={platformLayout.bottomSpacerStyle}
        />
      </KeyboardAvoidingView>
    </Animated.View>
  );

  return (
    <Portal name={portalName}>
      {isWeb ? (
        open ? (
          <View
            className="fixed inset-0"
            pointerEvents="box-none"
            style={{ zIndex: layer }}
          >
            {sheet}
          </View>
        ) : null
      ) : (
        <Modal
          focusable={false}
          onRequestClose={onDismiss}
          presentationStyle="overFullScreen"
          statusBarTranslucent
          transparent
          visible={open}
        >
          {sheet}
        </Modal>
      )}
    </Portal>
  );
};
