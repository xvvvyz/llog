import { Carousel } from '@/features/media/components/carousel';
import { useMediaLightboxDismiss } from '@/features/media/hooks/use-lightbox-dismiss';
import { useMediaLightboxTransition } from '@/features/media/hooks/use-lightbox-transition';
import { type Media } from '@/features/media/types/media';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { X } from 'phosphor-react-native';
import * as React from 'react';
import { Modal, Platform, StatusBar, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

export const Lightbox = ({
  media,
  mediaId,
  onActiveMediaChange,
  onCloseAnimationEnd,
  onRequestClose,
}: {
  media: Media[];
  mediaId?: string;
  onActiveMediaChange?: (mediaId: string) => void;
  onCloseAnimationEnd?: () => void;
  onRequestClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [isUiHidden, setIsUiHidden] = React.useState(false);

  const {
    animatedValues,
    backgroundStyle,
    dismissThreshold,
    dragFadeDistance,
    handleAnimatedRequestClose,
    handleInstantRequestClose,
    isClosing,
    isModalVisible,
    isVisible,
    overlayStyle,
    renderedMediaId,
  } = useMediaLightboxTransition({
    mediaId,
    onCloseAnimationEnd,
    onRequestClose,
  });

  const {
    dismissGesture,
    isDismissGestureActive,
    setIsDismissLocked,
    webTouchHandlers,
  } = useMediaLightboxDismiss({
    animatedValues,
    dismissThreshold,
    dragFadeDistance,
    isClosing,
    isModalVisible,
    isVisible,
    onAnimatedRequestClose: handleAnimatedRequestClose,
  });

  React.useEffect(() => {
    if (isModalVisible) return;
    setIsUiHidden(false);
  }, [isModalVisible]);

  const resolvedMediaId = mediaId ?? renderedMediaId;

  const defaultIndex = React.useMemo(() => {
    if (!resolvedMediaId) return -1;
    return media.findIndex((item) => item.id === resolvedMediaId);
  }, [media, resolvedMediaId]);

  const hasRenderedPreview = defaultIndex !== -1;
  if (!hasRenderedPreview) return null;

  const content = (
    <Animated.View
      className="absolute inset-0"
      onTouchCancel={webTouchHandlers.onTouchCancel}
      onTouchEnd={webTouchHandlers.onTouchEnd}
      onTouchMove={webTouchHandlers.onTouchMove}
      onTouchStart={webTouchHandlers.onTouchStart}
      pointerEvents={isClosing ? 'none' : 'auto'}
    >
      {Platform.OS !== 'web' ? <StatusBar animated hidden /> : null}
      <Animated.View
        className="absolute inset-0 bg-background"
        pointerEvents="none"
        style={backgroundStyle}
      />
      <View className="absolute inset-0">
        {!isUiHidden && (
          <Animated.View
            className="absolute right-4 top-1 z-10 rounded-full md:right-8 md:top-3"
            style={[overlayStyle, { marginTop: insets.top + 1 }]}
          >
            <Button
              className="size-11"
              onPress={handleInstantRequestClose}
              size="icon"
              variant="link"
              wrapperClassName="md:ml-4 md:-mr-4"
            >
              <Icon className="color-foreground" icon={X} size={24} />
            </Button>
          </Animated.View>
        )}
        <Carousel
          defaultIndex={defaultIndex}
          dismissMediaOpacity={animatedValues.mediaOpacity}
          dismissMediaTranslateY={animatedValues.translateY}
          dismissOverlayOpacity={animatedValues.overlayOpacity}
          isDismissGestureActive={isDismissGestureActive}
          isKeyboardNavigationEnabled={media.length > 1}
          media={media}
          onActiveMediaChange={onActiveMediaChange}
          onDismissLockChange={setIsDismissLocked}
          onUiHiddenChange={setIsUiHidden}
        />
      </View>
    </Animated.View>
  );

  return (
    <Modal
      animationType="none"
      focusable={false}
      onRequestClose={handleInstantRequestClose}
      presentationStyle="fullScreen"
      transparent
      visible={isModalVisible}
    >
      {Platform.OS === 'web' ? (
        content
      ) : (
        <GestureDetector gesture={dismissGesture}>{content}</GestureDetector>
      )}
    </Modal>
  );
};
