import * as audioAnalysisMenuItems from '@/features/files/components/audio-analysis-menu-items';
import { Carousel } from '@/features/files/components/carousel';
import { useMediaLightboxDismiss } from '@/features/files/hooks/use-lightbox-dismiss';
import { useMediaLightboxTransition } from '@/features/files/hooks/use-lightbox-transition';
import * as mediaPlaybackRate from '@/features/files/lib/media-playback-rate';
import { type FileItem } from '@/features/files/types/file';
import type { VideoPlayerHandle } from '@/features/files/types/video-player';
import * as recordRoutes from '@/features/records/lib/route';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { cn } from '@/lib/cn';
import { shareUrl } from '@/lib/share';
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
  ArrowLeft,
  CaretLeft,
  Check,
  CornersOut,
  DotsThreeVertical,
  ShareNetwork,
  Speedometer,
} from 'phosphor-react-native';

export const Lightbox = ({
  canAnalyzeAudio,
  media,
  mediaId,
  onActiveMediaChange,
  onCloseAnimationEnd,
  onRequestClose,
  recordId,
  shareableMediaIds,
}: {
  canAnalyzeAudio?: boolean;
  media: FileItem[];
  mediaId?: string;
  onActiveMediaChange?: (mediaId: string) => void;
  onCloseAnimationEnd?: () => void;
  onRequestClose: () => void;
  recordId?: string;
  shareableMediaIds?: ReadonlySet<string>;
}) => {
  const headerHeight = useHeaderHeight();
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
  const topControlStyle = { top: insets.top + (headerHeight - 44) / 2 };

  const renderActiveMediaMenu = React.useCallback(
    (file: FileItem) => {
      const isVideo = file.type === 'video';

      const shareTargetUrl =
        recordId && shareableMediaIds?.has(file.id)
          ? recordRoutes.getRecordMediaUrl(recordId, file.id)
          : undefined;

      const hasAnalysisMenuItems =
        isVideo &&
        audioAnalysisMenuItems.shouldShowAudioAnalysisMenu({
          canAnalyze: canAnalyzeAudio,
          file,
        });

      if (!shareTargetUrl && !isVideo) return null;

      return (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button
              accessibilityLabel={isVideo ? 'Video options' : 'Image options'}
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
            {!!shareTargetUrl && (
              <Menu.Item
                closeOnPress={false}
                onPress={async () => {
                  try {
                    await shareUrl({ title: 'llog', url: shareTargetUrl });
                  } catch {
                    // noop
                  }
                }}
              >
                <Icon className="text-placeholder" icon={ShareNetwork} />
                <Text>Share</Text>
              </Menu.Item>
            )}
            {isVideo && (
              <Menu.Item
                onPress={() => videoHandleRef.current?.enterFullscreen()}
              >
                <Icon className="text-placeholder" icon={CornersOut} />
                <Text>Fullscreen</Text>
              </Menu.Item>
            )}
            {isVideo && (
              <React.Fragment>
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
                {hasAnalysisMenuItems && <Menu.Separator />}
                <audioAnalysisMenuItems.AudioAnalysisMenuItems
                  canAnalyze={canAnalyzeAudio}
                  file={file}
                />
              </React.Fragment>
            )}
          </Menu.Content>
        </Menu.Root>
      );
    },
    [canAnalyzeAudio, recordId, shareableMediaIds, videoPlaybackRate]
  );

  useDismissStack({
    layer: overlayLayers.OVERLAY_LAYERS.modal,
    onDismiss: handleInstantRequestClose,
    open: hasRenderedPreview && isModalVisible,
  });

  if (!hasRenderedPreview) return null;

  const content = (
    <Animated.View
      onTouchCancel={webTouchHandlers.onTouchCancel}
      onTouchEnd={webTouchHandlers.onTouchEnd}
      onTouchMove={webTouchHandlers.onTouchMove}
      onTouchStart={webTouchHandlers.onTouchStart}
      className={cn(
        'absolute inset-0',
        isClosing ? 'pointer-events-none' : 'pointer-events-auto'
      )}
    >
      {Platform.OS !== 'web' && <StatusBar animated hidden />}
      <Animated.View
        className="absolute inset-0 bg-popover pointer-events-none"
        style={backgroundStyle}
      />
      <View className="absolute inset-0">
        {!isUiHidden && (
          <>
            <Animated.View
              className="absolute left-4 z-10 border-continuous rounded-full md:left-8"
              style={[overlayStyle, topControlStyle]}
            >
              <Button
                accessibilityLabel="Back"
                className="size-11"
                onPress={handleInstantRequestClose}
                size="icon"
                variant="link"
                wrapperClassName="md:-ml-4 md:mr-4"
              >
                <Icon
                  className="text-popover-foreground"
                  icon={Platform.select({ default: ArrowLeft, ios: CaretLeft })}
                  size={Platform.select({ default: 24, ios: 30 })}
                />
              </Button>
            </Animated.View>
          </>
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
          renderMediaActions={renderActiveMediaMenu}
          topActionsOffset={topControlStyle.top}
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
      presentationStyle="overFullScreen"
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
