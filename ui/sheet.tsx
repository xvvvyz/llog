import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { animation } from '@/lib/animation';
import { cn } from '@/lib/cn';
import { BREAKPOINT_VALUES } from '@/theme/tokens';
import { Loading } from '@/ui/loading';
import { OVERLAY_LAYERS } from '@/ui/overlay-layers';
import { useSheetPlatformLayout } from '@/ui/sheet-platform';
import { useSheetStack, useSheetStackBackdrop } from '@/ui/sheet-stack';
import { Portal } from '@rn-primitives/portal';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native';

import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
} from 'react-native-reanimated';

export const SHEET_LAYERS = {
  route: OVERLAY_LAYERS.routeSheet,
  action: OVERLAY_LAYERS.actionSheet,
} as const;

const sheetVariants = cva(
  'border-border-secondary bg-popover min-h-0 overflow-hidden rounded-t-4xl border-x border-t md:w-full md:max-w-[30rem] md:rounded-4xl md:border-b border-continuous',
  {
    defaultVariants: { variant: 'default' },
    variants: { variant: { default: '', list: 'md:rounded-3xl' } },
  }
);

const sheetLoadingVariants = cva(
  'absolute inset-0 z-10 py-8 border-continuous rounded-t-4xl bg-popover md:rounded-4xl',
  {
    defaultVariants: { variant: 'default' },
    variants: { variant: { default: '', list: 'md:rounded-3xl' } },
  }
);

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
  portalHostName,
  portalName,
  topInset = 72,
  variant,
}: {
  children: React.ReactNode;
  className?: string;
  layer?: number;
  loading?: boolean;
  onDismiss: () => void;
  open: boolean;
  portalHostName?: string;
  portalName: string;
  topInset?: number;
} & VariantProps<typeof sheetVariants>) => {
  const isWeb = Platform.OS === 'web';
  const inset = useSafeAreaInsets();
  const windowDimensions = useWindowDimensions();
  const isDesktopSheet = windowDimensions.width >= BREAKPOINT_VALUES.md;
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
      platformLayout.viewportHeight -
        inset.top -
        (isDesktopSheet ? topInset * 2 : topInset) -
        inset.bottom
    )
  );

  const heightStyle = { maxHeight: availableHeight };
  const shouldRenderInlineBackdrop = !isWeb || portalHostName != null;

  const sheet = (
    <Animated.View
      className="absolute inset-0"
      entering={animation(FadeInDown)}
      exiting={animation(isDesktopSheet ? FadeOut : FadeOutDown)}
      pointerEvents={isWeb ? 'box-none' : 'auto'}
    >
      {shouldRenderInlineBackdrop && (
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
        className="absolute inset-0 justify-end md:px-6 md:items-center md:justify-center"
        pointerEvents="box-none"
        style={platformLayout.keyboardAvoidingStyle}
      >
        <View
          ref={sheetContentRef}
          style={heightStyle}
          className={cn(
            sheetVariants({ variant }),
            loading && 'min-h-32',
            className
          )}
        >
          {children}
          {loading && (
            <Animated.View
              className={sheetLoadingVariants({ variant })}
              exiting={animation(FadeOut)}
            >
              <Loading className="p-0 bg-popover" />
            </Animated.View>
          )}
        </View>
        {isDesktopSheet ? null : (
          <View
            className="border-border border-x bg-popover"
            style={platformLayout.bottomSpacerStyle}
          />
        )}
      </KeyboardAvoidingView>
    </Animated.View>
  );

  return (
    <Portal hostName={portalHostName} name={portalName}>
      {isWeb ? (
        open ? (
          <View
            className="fixed inset-0"
            pointerEvents="box-none"
            style={{ zIndex: sheetStack.zIndex }}
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
