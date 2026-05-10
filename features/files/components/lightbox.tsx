import * as audioAnalysisMenuItems from '@/features/files/components/audio-analysis-menu-items';
import { Carousel } from '@/features/files/components/carousel';
import { useMediaLightboxDismiss } from '@/features/files/hooks/use-lightbox-dismiss';
import { useMediaLightboxTransition } from '@/features/files/hooks/use-lightbox-transition';
import * as mediaPlaybackRate from '@/features/files/lib/media-playback-rate';
import { type FileItem } from '@/features/files/types/file';
import type { VideoPlayerHandle } from '@/features/files/types/video-player';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { Button } from '@/ui/button';
import { useDismissStack } from '@/ui/dismiss-stack';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import * as overlayLayers from '@/ui/overlay-layers';
import { Text } from '@/ui/text';
import { PortalHost } from '@rn-primitives/portal';
import * as React from 'react';
import { Modal, Platform, StatusBar, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import {
  Check,
  CornersOut,
  DotsThreeVertical,
  Speedometer,
  X,
} from 'phosphor-react-native';

export const Lightbox = ({
  canAnalyzeAudio,
  media,
  mediaId,
  onActiveMediaChange,
  onCloseAnimationEnd,
  onRequestClose,
}: {
  canAnalyzeAudio?: boolean;
  media: FileItem[];
  mediaId?: string;
  onActiveMediaChange?: (mediaId: string) => void;
  onCloseAnimationEnd?: () => void;
  onRequestClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [isUiHidden, setIsUiHidden] = React.useState(false);

  const [videoPlaybackRate, setVideoPlaybackRate] =
    React.useState<mediaPlaybackRate.PlaybackRate>(
      mediaPlaybackRate.DEFAULT_PLAYBACK_RATE
    );

  const videoHandleRef = React.useRef<VideoPlayerHandle | null>(null);

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
  const activeMedia = hasRenderedPreview ? media[defaultIndex] : undefined;

  const hasActiveVideoAnalysisMenuItems =
    activeMedia?.type === 'video' &&
    audioAnalysisMenuItems.shouldShowAudioAnalysisMenu({
      canAnalyze: canAnalyzeAudio,
      file: activeMedia,
    });

  const showActiveVideoMenu = activeMedia?.type === 'video';

  useDismissStack({
    layer: overlayLayers.OVERLAY_LAYERS.modal,
    onDismiss: handleInstantRequestClose,
    open: hasRenderedPreview && isModalVisible,
  });

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
      {Platform.OS !== 'web' && <StatusBar animated hidden />}
      <Animated.View
        className="absolute inset-0 bg-popover"
        pointerEvents="none"
        style={backgroundStyle}
      />
      <View className="absolute inset-0">
        {!isUiHidden && (
          <Animated.View
            className="absolute right-4 top-1 z-10 border-continuous rounded-full md:right-8 md:top-3"
            style={[overlayStyle, { marginTop: insets.top + 1 }]}
          >
            <View className="items-center">
              <Button
                className="size-11"
                onPress={handleInstantRequestClose}
                size="icon"
                variant="link"
                wrapperClassName="md:ml-4 md:-mr-4"
              >
                <Icon className="text-popover-foreground" icon={X} size={24} />
              </Button>
              {showActiveVideoMenu && (
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <Button
                      accessibilityLabel="Video options"
                      className="size-11"
                      size="icon"
                      variant="link"
                      wrapperClassName="md:ml-4 md:-mr-4"
                    >
                      <Icon
                        className="text-popover-foreground"
                        icon={DotsThreeVertical}
                        size={24}
                      />
                    </Button>
                  </Menu.Trigger>
                  <Menu.Content
                    align="end"
                    className="min-w-48"
                    portalHostName={overlayLayers.MEDIA_LIGHTBOX_PORTAL_HOST}
                  >
                    <Menu.Item
                      onPress={() => videoHandleRef.current?.enterFullscreen()}
                    >
                      <Icon className="text-placeholder" icon={CornersOut} />
                      <Text>Fullscreen</Text>
                    </Menu.Item>
                    <Menu.Separator />
                    {mediaPlaybackRate.PLAYBACK_RATES.map((playbackRate) => {
                      const isSelected = playbackRate === videoPlaybackRate;

                      return (
                        <Menu.Item
                          key={playbackRate}
                          onPress={() => setVideoPlaybackRate(playbackRate)}
                        >
                          <Icon
                            className="text-placeholder"
                            icon={isSelected ? Check : Speedometer}
                          />
                          <Text className="tabular-nums">
                            {playbackRate.toFixed(1)}×
                          </Text>
                        </Menu.Item>
                      );
                    })}
                    {hasActiveVideoAnalysisMenuItems && <Menu.Separator />}
                    <audioAnalysisMenuItems.AudioAnalysisMenuItems
                      canAnalyze={canAnalyzeAudio}
                      file={activeMedia}
                    />
                  </Menu.Content>
                </Menu.Root>
              )}
            </View>
          </Animated.View>
        )}
        <Carousel
          defaultIndex={defaultIndex}
          dismissMediaOpacity={animatedValues.mediaOpacity}
          dismissMediaTranslateY={animatedValues.translateY}
          dismissOverlayOpacity={animatedValues.overlayOpacity}
          files={media}
          isDismissGestureActive={isDismissGestureActive}
          isKeyboardNavigationEnabled={media.length > 1}
          onActiveMediaChange={onActiveMediaChange}
          onDismissLockChange={setIsDismissLocked}
          onUiHiddenChange={setIsUiHidden}
          videoHandleRef={videoHandleRef}
          videoPlaybackRate={videoPlaybackRate}
        />
        <PortalHost name={overlayLayers.MEDIA_LIGHTBOX_PORTAL_HOST} />
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
