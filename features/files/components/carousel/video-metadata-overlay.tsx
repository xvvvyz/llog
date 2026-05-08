import * as mediaMetadataPrimitives from '@/features/files/components/media-metadata-primitives';
import { TrackMetadata } from '@/features/files/components/track-metadata';
import { TranscriptMetadata } from '@/features/files/components/transcript-metadata';
import * as audioMetadata from '@/features/files/lib/audio-metadata';
import type { FileItem } from '@/features/files/types/file';
import { Button } from '@/ui/button';
import * as overlayLayers from '@/ui/overlay-layers';
import { Text } from '@/ui/text';
import * as React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';

const CAPTION_TIMING_GRACE_SECONDS = 0.25;
const CAPTION_HORIZONTAL_PADDING = 48;
const CAPTION_MIN_LINE_LENGTH = 24;
const CAPTION_MAX_LINE_LENGTH = 54;
const VIDEO_TRACK_BOTTOM_OFFSET = 52;
const VIDEO_TRANSCRIPT_BOTTOM_OFFSET = 62;
const VIDEO_TRANSCRIPT_TRACK_GAP = 24;

const getVisibleTranscriptSegment = ({
  currentTime,
  segments,
}: {
  currentTime: number;
  segments: readonly audioMetadata.AudioTranscriptSegment[];
}) => {
  const { currentIndex } = audioMetadata.getTranscriptNavigationState({
    currentTimeSeconds: currentTime,
    segments,
  });

  const segment = segments[currentIndex];
  if (!segment) return;

  const isVisible =
    currentTime + CAPTION_TIMING_GRACE_SECONDS >= segment.startSeconds &&
    currentTime - CAPTION_TIMING_GRACE_SECONDS <= segment.endSeconds;

  return isVisible ? segment : undefined;
};

const getCaptionMaxLineLength = (windowWidth: number) =>
  Math.max(
    CAPTION_MIN_LINE_LENGTH,
    Math.min(
      CAPTION_MAX_LINE_LENGTH,
      Math.floor(
        Math.max(0, Math.min(windowWidth, 760) - CAPTION_HORIZONTAL_PADDING) / 8
      )
    )
  );

const getBalancedCaptionLines = (text: string, maxLineLength: number) => {
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  if (!normalizedText) return [];
  if (normalizedText.length <= maxLineLength) return [normalizedText];
  const words = normalizedText.split(' ');
  if (words.length <= 1) return [normalizedText];

  const candidates = words.slice(1).flatMap((_, index) => {
    const splitIndex = index + 1;
    const firstLine = words.slice(0, splitIndex).join(' ');
    const secondLine = words.slice(splitIndex).join(' ');
    if (!firstLine || !secondLine) return [];

    const overflow =
      Math.max(0, firstLine.length - maxLineLength) +
      Math.max(0, secondLine.length - maxLineLength);

    return [
      {
        lines: [firstLine, secondLine],
        score:
          Math.abs(firstLine.length - secondLine.length) +
          overflow * maxLineLength,
      },
    ];
  });

  return (
    candidates.sort((a, b) => a.score - b.score)[0]?.lines ?? [normalizedText]
  );
};

export const VideoMetadataOverlay = ({
  currentTime,
  file,
  isHidden,
  onTrackOpenChange,
  onTranscriptOpenChange,
  scrubberBottomOffset,
  trackControls,
  transcriptControls,
}: {
  currentTime: number;
  file?: FileItem;
  isHidden?: boolean;
  onTrackOpenChange?: (open: boolean) => void;
  onTranscriptOpenChange?: (open: boolean) => void;
  scrubberBottomOffset: number;
  trackControls: mediaMetadataPrimitives.MediaMetadataPlaybackControls;
  transcriptControls: mediaMetadataPrimitives.MediaMetadataPlaybackControls;
}) => {
  const { width: windowWidth } = useWindowDimensions();

  const tracks = React.useMemo(
    () => audioMetadata.parseAudioTracks(file?.tracks, { fileId: file?.id }),
    [file?.id, file?.tracks]
  );

  const transcript = React.useMemo(
    () => audioMetadata.parseTranscriptSegments(file?.transcript),
    [file?.transcript]
  );

  const currentTrack = React.useMemo(() => {
    if (!tracks.length) return;

    return audioMetadata.getTrackNavigationState({
      currentTimeSeconds: currentTime,
      tracks,
    }).currentTrack;
  }, [currentTime, tracks]);

  const currentTranscriptSegment = React.useMemo(
    () => getVisibleTranscriptSegment({ currentTime, segments: transcript }),
    [currentTime, transcript]
  );

  const captionLines = React.useMemo(
    () =>
      currentTranscriptSegment
        ? getBalancedCaptionLines(
            currentTranscriptSegment.text,
            getCaptionMaxLineLength(windowWidth)
          )
        : [],
    [currentTranscriptSegment, windowWidth]
  );

  if (file?.type !== 'video') return null;
  if (isHidden) return null;
  if (!currentTrack && transcript.length === 0) return null;
  const trackBottomOffset = scrubberBottomOffset + VIDEO_TRACK_BOTTOM_OFFSET;

  const transcriptBottomOffset =
    scrubberBottomOffset +
    VIDEO_TRANSCRIPT_BOTTOM_OFFSET +
    (currentTrack
      ? mediaMetadataPrimitives.TRACK_SHEET_ARTWORK_SIZE +
        VIDEO_TRANSCRIPT_TRACK_GAP
      : 0);

  return (
    <React.Fragment>
      {tracks.length > 0 && (
        <TrackMetadata
          controls={trackControls}
          layer={overlayLayers.OVERLAY_LAYERS.modal + 1}
          onOpenChange={onTrackOpenChange}
          portalHostName={overlayLayers.MEDIA_LIGHTBOX_PORTAL_HOST}
          portalNamePrefix="video-tracks"
          tracks={tracks}
          renderFooter={({ closeSheet }) => (
            <Button
              onPress={closeSheet}
              size="sm"
              variant="secondary"
              wrapperClassName="w-full"
            >
              <Text>Close</Text>
            </Button>
          )}
          renderTrigger={({ currentTrack, openSheet }) => (
            <View
              className="absolute left-4 right-4 z-10 md:right-8"
              pointerEvents="box-none"
              style={{ bottom: trackBottomOffset }}
            >
              <View className="flex-row min-w-0 w-full gap-3 items-center justify-between">
                <Pressable
                  accessibilityRole="button"
                  className="flex-1 flex-row max-w-[18rem] min-w-0 pl-1 gap-3 items-center"
                  onPress={openSheet}
                >
                  <mediaMetadataPrimitives.TrackArtwork
                    className="overflow-hidden rounded-md bg-transparent shrink-0"
                    size={mediaMetadataPrimitives.TRACK_SHEET_ARTWORK_SIZE}
                    track={currentTrack}
                  />
                  <mediaMetadataPrimitives.TrackText
                    artistClassName="text-popover-foreground/60"
                    titleClassName="text-popover-foreground/90"
                    track={currentTrack}
                  />
                </Pressable>
                <mediaMetadataPrimitives.TrackLinksMenu
                  className="shrink-0"
                  portalHostName={overlayLayers.MEDIA_LIGHTBOX_PORTAL_HOST}
                  track={currentTrack}
                  triggerButtonClassName="size-11"
                  triggerButtonSize="icon"
                  triggerButtonVariant="link"
                  triggerButtonWrapperClassName="md:ml-4 md:-mr-4"
                  triggerIconClassName="text-popover-foreground/70"
                  triggerIconSize={24}
                />
              </View>
            </View>
          )}
        />
      )}
      {transcript.length > 0 && (
        <TranscriptMetadata
          controls={transcriptControls}
          layer={overlayLayers.OVERLAY_LAYERS.modal + 1}
          onOpenChange={onTranscriptOpenChange}
          portalHostName={overlayLayers.MEDIA_LIGHTBOX_PORTAL_HOST}
          portalNamePrefix="video-transcript"
          segments={transcript}
          renderFooter={({ closeSheet }) => (
            <Button
              onPress={closeSheet}
              size="sm"
              variant="secondary"
              wrapperClassName="w-full"
            >
              <Text>Close</Text>
            </Button>
          )}
          renderTrigger={({ openSheet }) =>
            currentTranscriptSegment ? (
              <View
                className="absolute left-6 right-6 z-10 items-center md:left-16 md:right-16"
                pointerEvents="box-none"
                style={{ bottom: transcriptBottomOffset }}
              >
                <Pressable
                  accessibilityRole="button"
                  className="max-w-3xl gap-1 items-center"
                  onPress={openSheet}
                >
                  {captionLines.map((line, index) => (
                    <Text
                      key={`${line}:${index}`}
                      className="max-w-full px-1.5 py-0.5 bg-background/75 font-medium leading-snug text-balance text-base text-center text-foreground rounded md:text-lg"
                      numberOfLines={1}
                    >
                      {line}
                    </Text>
                  ))}
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </React.Fragment>
  );
};
