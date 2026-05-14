import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { animation } from '@/lib/animation';
import { cn } from '@/lib/cn';
import { BREAKPOINT_VALUES } from '@/theme/tokens';
import { OVERLAY_LAYERS } from '@/ui/overlay-layers';
import { useSheetPlatformLayout } from '@/ui/sheet-platform';
import { useSheetStack, useSheetStackBackdrop } from '@/ui/sheet-stack';
import { Spinner } from '@/ui/spinner';
import { Portal } from '@rn-primitives/portal';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { GestureDetector } from 'react-native-gesture-handler';
import * as sheetDrag from '@/ui/sheet-drag';

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

export {
  SHEET_SORTABLE_DRAG_HANDLE_PROPS,
  useSheetDragLock,
  useSheetScrollHandler,
} from '@/ui/sheet-drag';

export const SHEET_LAYERS = {
  route: OVERLAY_LAYERS.routeSheet,
  action: OVERLAY_LAYERS.actionSheet,
} as const;

const sheetVariants = cva(
  'border-border-secondary bg-popover min-h-0 overflow-hidden rounded-t-4xl border-x border-t md:w-full md:max-w-sheet md:rounded-4xl md:border-b border-continuous',
  {
    defaultVariants: { variant: 'default' },
    variants: { variant: { default: '', list: 'md:rounded-3xl' } },
  }
);

const sheetLoadingVariants = cva(
  'absolute inset-0 z-10 items-center justify-center border-continuous rounded-t-4xl bg-popover md:rounded-4xl',
  {
    defaultVariants: { variant: 'default' },
    variants: { variant: { default: '', list: 'md:rounded-3xl' } },
  }
);

export const SheetBackdrop = () => {
  const backdrop = useSheetStackBackdrop();

  const backdropDragStyle = sheetDrag.useSheetBackdropDragStyle(
    backdrop.translateY,
    backdrop.fadeDistance
  );

  if (Platform.OS !== 'web' || !backdrop.open) return null;

  return (
    <Portal name="sheet-backdrop">
      <Animated.View
        className="fixed inset-0 bg-background/90"
        entering={animation(FadeIn)}
        exiting={animation(FadeOut)}
        style={[{ zIndex: backdrop.layer }, backdropDragStyle]}
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

  const sheetContentRef =
    React.useRef<React.ComponentRef<typeof Animated.View>>(null);

  const sheetDragMetrics = sheetDrag.useSheetDragMetrics(
    windowDimensions.height
  );

  const sheetStack = useSheetStack({
    backdropFadeDistance: sheetDragMetrics.dismissThreshold,
    backdropTranslateY: sheetDragMetrics.translateY,
    layer,
    onDismiss,
    open,
  });

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

  const sheetDragBehavior = sheetDrag.useSheetDragBehavior({
    ...sheetDragMetrics,
    isTopSheet: sheetStack.isTopSheet,
    isWeb,
    onDismiss,
    open,
  });

  const sheetCard = (
    <Animated.View
      ref={sheetContentRef}
      style={[heightStyle, sheetDragBehavior.sheetStyle]}
      className={cn(
        sheetVariants({ variant }),
        loading && 'min-h-24',
        className
      )}
      {...sheetDrag.SHEET_DRAG_SURFACE_PROPS}
      {...sheetDragBehavior.webTouchHandlers}
    >
      <View
        accessibilityElementsHidden
        aria-hidden
        className="relative z-20 h-5 items-center justify-center shrink-0 md:hidden"
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        <View className="h-1.5 w-11 rounded-full bg-border-secondary" />
      </View>
      <sheetDrag.SheetDragProviders
        dragLock={sheetDragBehavior.dragLockContext}
        scroll={sheetDragBehavior.scrollContext}
      >
        {children}
        {loading && (
          <Animated.View
            className={sheetLoadingVariants({ variant })}
            entering={animation(FadeIn)}
            exiting={animation(FadeOut)}
          >
            <Spinner />
          </Animated.View>
        )}
      </sheetDrag.SheetDragProviders>
    </Animated.View>
  );

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
          style={
            sheetStack.isLastSheet ? sheetDragBehavior.backdropStyle : undefined
          }
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
        {isWeb ? (
          sheetCard
        ) : (
          <GestureDetector gesture={sheetDragBehavior.dismissGesture}>
            {sheetCard}
          </GestureDetector>
        )}
        {isDesktopSheet ? null : (
          <Animated.View
            className="border-border border-x bg-popover"
            style={[
              platformLayout.bottomSpacerStyle,
              sheetDragBehavior.sheetStyle,
            ]}
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
