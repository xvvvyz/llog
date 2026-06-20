import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { animation } from '@/lib/animation';
import { cn } from '@/lib/cn';
import { dismissKeyboard } from '@/lib/keyboard';
import { BREAKPOINT_VALUES } from '@/theme/tokens';
import { OVERLAY_LAYERS } from '@/ui/overlay-layers';
import { OverlayPortalHostProvider } from '@/ui/overlay-portal-host';
import { useActiveRouteSheetHostName } from '@/ui/route-sheet-host';
import { useSheetDragBehavior } from '@/ui/sheet-drag-behavior';
import { SHEET_DRAG_SURFACE_PROPS } from '@/ui/sheet-drag-constants';
import { SheetDragProviders } from '@/ui/sheet-drag-context';
import { useSheetPlatformLayout } from '@/ui/sheet-platform';
import { useSheetStack, useSheetStackBackdrop } from '@/ui/sheet-stack';
import { Spinner } from '@/ui/spinner';
import { Portal, PortalHost } from '@rn-primitives/portal';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { GestureDetector } from 'react-native-gesture-handler';
import * as sheetDragMetrics from '@/ui/sheet-drag-metrics';

import {
  BackHandler,
  KeyboardAvoidingView,
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

export { SHEET_SORTABLE_DRAG_HANDLE_PROPS } from '@/ui/sheet-drag-constants';

export {
  useSheetDragLock,
  useSheetScrollHandler,
} from '@/ui/sheet-drag-context';

export const SHEET_LAYERS = {
  route: OVERLAY_LAYERS.routeSheet,
  action: OVERLAY_LAYERS.actionSheet,
} as const;

export const SHEET_DEFAULT_TOP_INSET = 72;

export const getSheetAvailableHeight = ({
  insetBottom,
  insetTop,
  isDesktopSheet,
  topInset,
  viewportHeight,
}: {
  insetBottom: number;
  insetTop: number;
  isDesktopSheet: boolean;
  topInset: number;
  viewportHeight: number;
}) =>
  Math.max(
    1,
    Math.round(
      viewportHeight -
        insetTop -
        (isDesktopSheet ? topInset * 2 : topInset) -
        insetBottom
    )
  );

const sheetVariants = cva(
  'border-border-secondary bg-popover min-h-0 overflow-hidden rounded-t-4xl border-x border-t md:w-full md:rounded-4xl md:border-b border-continuous',
  {
    defaultVariants: { variant: 'default', width: 'default' },
    variants: {
      variant: { default: '', list: 'md:rounded-3xl' },
      width: {
        default: 'md:max-w-sheet',
        narrow: 'md:max-w-sm',
        editor: 'md:max-w-4xl',
      },
    },
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

  const backdropDragStyle = sheetDragMetrics.useSheetBackdropDragStyle(
    backdrop.translateY,
    backdrop.fadeDistance
  );

  if (Platform.OS !== 'web' || !backdrop.open) return null;

  return (
    <Portal name="sheet-backdrop">
      <Animated.View
        className="fixed inset-0"
        entering={animation(FadeIn)}
        exiting={animation(FadeOut)}
        style={{ zIndex: backdrop.layer }}
      >
        <Animated.View
          className="absolute inset-0 bg-background/90"
          style={backdropDragStyle}
        >
          <Pressable
            className="h-full w-full cursor-default"
            onPress={backdrop.onDismiss}
          />
        </Animated.View>
      </Animated.View>
    </Portal>
  );
};

export const Sheet = ({
  children,
  className,
  desktopAccessory,
  layer = SHEET_LAYERS.action,
  loading,
  onDismiss,
  open,
  portalHostName,
  portalName,
  topInset = SHEET_DEFAULT_TOP_INSET,
  variant,
  width,
}: {
  children: React.ReactNode;
  className?: string;
  desktopAccessory?: React.ReactNode;
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
  const overlayPortalHostId = React.useId();
  // Native modal routes are presented above the root portal host, so sheets
  // without an explicit host portal into the active route host instead. The
  // host is captured when the sheet opens so an already-open sheet is never
  // re-parented (which would remount its content) by route changes under it.
  const activeRouteSheetHostName = useActiveRouteSheetHostName();
  const openRouteSheetHostNameRef = React.useRef<string | undefined>(undefined);
  const wasOpenForRouteHostRef = React.useRef(false);

  if (open && !wasOpenForRouteHostRef.current) {
    openRouteSheetHostNameRef.current = isWeb
      ? undefined
      : activeRouteSheetHostName;
  }

  wasOpenForRouteHostRef.current = open;

  const resolvedPortalHostName =
    portalHostName ?? openRouteSheetHostNameRef.current;

  const overlayPortalHostName = React.useMemo(
    () =>
      `sheet-overlay-${portalName}-${overlayPortalHostId.replace(/:/g, '')}`,
    [overlayPortalHostId, portalName]
  );

  const sheetContentRef =
    React.useRef<React.ComponentRef<typeof Animated.View>>(null);

  const dragMetrics = sheetDragMetrics.useSheetDragMetrics(
    windowDimensions.height
  );

  const shouldRenderInlineBackdrop = !isWeb || portalHostName != null;

  const sheetStack = useSheetStack({
    backdropFadeDistance: dragMetrics.dismissThreshold,
    backdropTranslateY: dragMetrics.translateY,
    layer,
    onDismiss,
    open,
    usesGlobalBackdrop: !shouldRenderInlineBackdrop,
  });

  const platformLayout = useSheetPlatformLayout({
    activeElementRootRef: sheetContentRef,
    bottomInset: inset.bottom,
    keyboardAvoidingEnabled: sheetStack.isTopSheet,
    open,
    windowHeight: windowDimensions.height,
  });

  const availableHeight = getSheetAvailableHeight({
    insetBottom: inset.bottom,
    insetTop: inset.top,
    isDesktopSheet,
    topInset,
    viewportHeight: platformLayout.viewportHeight,
  });

  const heightStyle = { maxHeight: availableHeight };
  // When a close goes through the slide-out animation, the sheet is already
  // off-screen by the time it unmounts — the exiting layout animation would
  // invisibly retain the whole native subtree for another animation pass.
  const [isClosingWithSlide, setIsClosingWithSlide] = React.useState(false);

  const handleCloseAnimationStart = React.useCallback(
    () => setIsClosingWithSlide(true),
    []
  );

  React.useEffect(() => {
    if (open) setIsClosingWithSlide(false);
  }, [open]);

  const sheetDragBehavior = useSheetDragBehavior({
    ...dragMetrics,
    isTopSheet: sheetStack.isTopSheet,
    isWeb,
    onCloseAnimationStart: handleCloseAnimationStart,
    onDismiss,
    open,
  });

  const { closeWithAnimation } = sheetDragBehavior;

  const requestDismiss = React.useCallback(() => {
    if (isWeb) {
      onDismiss();
      return;
    }

    dismissKeyboard({ immediate: true });
    closeWithAnimation(onDismiss);
  }, [closeWithAnimation, isWeb, onDismiss]);

  React.useEffect(() => {
    if (isWeb || !open) return;
    return () => dismissKeyboard({ immediate: true });
  }, [isWeb, open]);

  React.useEffect(() => {
    if (isWeb || !open || !sheetStack.isTopSheet) return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        requestDismiss();
        return true;
      }
    );

    return () => subscription.remove();
  }, [isWeb, open, requestDismiss, sheetStack.isTopSheet]);

  const sheetCard = (
    <Animated.View
      ref={sheetContentRef}
      style={[heightStyle, sheetDragBehavior.sheetStyle]}
      className={cn(
        sheetVariants({ variant, width }),
        isWeb && 'pointer-events-auto',
        loading && 'min-h-24',
        className
      )}
      {...SHEET_DRAG_SURFACE_PROPS}
      {...sheetDragBehavior.webTouchHandlers}
    >
      <View
        accessibilityElementsHidden
        aria-hidden
        className="relative z-20 h-5 pointer-events-none items-center justify-center shrink-0 md:hidden"
        importantForAccessibility="no-hide-descendants"
      >
        <View className="h-1.5 w-11 rounded-full bg-border-secondary" />
      </View>
      <SheetDragProviders
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
      </SheetDragProviders>
    </Animated.View>
  );

  const sheet = (
    <Animated.View
      entering={animation(FadeInDown)}
      className={cn(
        'absolute inset-0',
        isWeb ? 'pointer-events-none' : 'pointer-events-auto'
      )}
      exiting={
        isClosingWithSlide
          ? undefined
          : animation(isDesktopSheet ? FadeOut : FadeOutDown)
      }
    >
      {shouldRenderInlineBackdrop && (
        <Animated.View
          className="absolute inset-0 pointer-events-auto"
          entering={animation(FadeIn)}
          exiting={animation(FadeOut)}
        >
          <Animated.View
            className="absolute inset-0 bg-background/90"
            style={
              sheetStack.isLastSheet
                ? sheetDragBehavior.backdropStyle
                : undefined
            }
          >
            <Pressable
              className="h-full w-full cursor-default"
              onPress={requestDismiss}
            />
          </Animated.View>
        </Animated.View>
      )}
      {!isWeb && !isDesktopSheet && platformLayout.keyboardBackdropStyle && (
        <Animated.View
          className="absolute bottom-0 left-0 right-0 bg-popover"
          pointerEvents="none"
          style={platformLayout.keyboardBackdropStyle}
        />
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className={cn(
          'absolute inset-0 justify-end md:px-6 md:items-center md:justify-center',
          isWeb && 'pointer-events-none'
        )}
        style={[
          platformLayout.keyboardAvoidingStyle,
          !isWeb && { pointerEvents: 'box-none' },
        ]}
      >
        {isWeb ? (
          sheetCard
        ) : (
          <GestureDetector gesture={sheetDragBehavior.dismissGesture}>
            {sheetCard}
          </GestureDetector>
        )}
        {isDesktopSheet && desktopAccessory ? (
          <Animated.View
            className="absolute inset-0 pointer-events-none items-center justify-center md:px-6"
            style={sheetDragBehavior.sheetStyle}
          >
            <View className="relative h-full max-w-sheet w-full pointer-events-none">
              {desktopAccessory}
            </View>
          </Animated.View>
        ) : null}
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

  const portalContent = open ? (
    <View
      style={{ elevation: sheetStack.zIndex, zIndex: sheetStack.zIndex }}
      className={cn(
        isWeb ? 'fixed inset-0 pointer-events-none' : 'absolute inset-0'
      )}
    >
      <OverlayPortalHostProvider hostName={overlayPortalHostName}>
        {sheet}
      </OverlayPortalHostProvider>
      <PortalHost name={overlayPortalHostName} />
    </View>
  ) : null;

  return (
    <Portal hostName={resolvedPortalHostName} name={portalName}>
      {portalContent}
    </Portal>
  );
};
