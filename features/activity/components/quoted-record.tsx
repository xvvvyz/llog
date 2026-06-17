import { AudioPlaylist } from '@/features/files/components/audio-player';
import { DocumentAttachments } from '@/features/files/components/document-attachments';
import { useFilteredFiles } from '@/features/files/hooks/use-filtered-files';
import { useMediaLightbox } from '@/features/files/hooks/use-lightbox';
import * as offlineAvailability from '@/features/files/lib/offline-availability';
import * as visualMedia from '@/features/files/lib/visual-media';
import { FileItem } from '@/features/files/types/file';
import { LinkAttachments } from '@/features/records/components/link-attachments';
import { TruncatedText } from '@/features/records/components/truncated-text';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { Link } from '@/features/records/types/link';
import { cn } from '@/lib/cn';
import { getSpectrumBackgroundClassName } from '@/theme/spectrum-class-names';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Spinner } from '@/ui/spinner';
import { TextContext } from '@/ui/text';
import { Play } from 'phosphor-react-native';
import * as React from 'react';

import {
  Platform,
  Pressable,
  ScrollView,
  View,
  type LayoutChangeEvent,
} from 'react-native';

const QUOTED_TEXT_LINES = 2;
// Horizontal chrome around the compact quote text: the w-1 color bar (4) +
// p-3 container padding (12 × 2) + the gap-2.5 between bar and text (10).
const QUOTED_TEXT_CHROME_WIDTH = 38;

const QuotedRecordThumb = ({
  item,
  onPress,
  recordId,
}: {
  item: FileItem;
  onPress: (fileId: string) => void;
  recordId?: string;
}) => {
  const thumbnailUri = visualMedia.getThumbnailUri(item);

  const cachedThumbnail = offlineAvailability.useCachedFileSource({
    enabled: true,
    options: { targetSize: 128 },
    type: 'image',
    uri: thumbnailUri,
  });

  const isProcessing = visualMedia.isProcessing(item);
  const canOpenMedia = !!recordId && !isProcessing;

  return (
    <Pressable
      className="overflow-hidden h-16 w-16 border-continuous rounded-lg shrink-0"
      disabled={!canOpenMedia}
      onPress={() => {
        if (canOpenMedia) onPress(item.id);
      }}
    >
      <Image
        contentFit="cover"
        height={64}
        src={cachedThumbnail.src}
        targetSize={128}
        uri={thumbnailUri}
        width={64}
      />
      {item.type === 'video' && (
        <View className="absolute inset-0 pointer-events-none items-center justify-center">
          {isProcessing ? (
            <Spinner />
          ) : (
            <View className="size-6 border-continuous rounded-full bg-background/50 items-center justify-center">
              <Icon
                className="text-foreground"
                icon={Play}
                size={12}
                weight="fill"
              />
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
};

export const QuotedRecord = ({
  canAnalyzeAudio,
  logColorIndex,
  links = [],
  files,
  recordId,
  text,
}: {
  canAnalyzeAudio: boolean;
  links?: Link[];
  logColorIndex?: number | null;
  files?: FileItem[];
  recordId?: string;
  text?: string;
}) => {
  const {
    audioMedia,
    documentFiles,
    visualMedia: visualItems,
  } = useFilteredFiles(files || []);

  const [availableWidth, setAvailableWidth] = React.useState(0);
  const displayText = trimDisplayText(text);
  const { openMediaLightbox } = useMediaLightbox({ recordId });
  const hasAudioFiles = audioMedia.length > 0;
  const hasDocumentFiles = documentFiles.length > 0;
  const hasLinks = links.length > 0;
  const hasFullWidthContent = hasAudioFiles || hasDocumentFiles || hasLinks;

  const shouldMeasureTextWidth =
    Platform.OS !== 'web' && !!displayText && !hasFullWidthContent;

  const compactMaxWidth =
    shouldMeasureTextWidth && availableWidth > 0 ? availableWidth : undefined;

  const compactTextMaxWidth =
    compactMaxWidth != null
      ? Math.max(1, compactMaxWidth - QUOTED_TEXT_CHROME_WIDTH)
      : undefined;

  const handleMeasureAvailableWidth = React.useCallback(
    (event: LayoutChangeEvent) => {
      if (!shouldMeasureTextWidth) return;
      const nextWidth = Math.ceil(event.nativeEvent.layout.width);

      setAvailableWidth((current) =>
        current === nextWidth ? current : nextWidth
      );
    },
    [shouldMeasureTextWidth]
  );

  if (
    !displayText &&
    !visualItems.length &&
    !hasAudioFiles &&
    !hasDocumentFiles &&
    !hasLinks
  ) {
    return null;
  }

  const quote = (
    <View
      className={cn(
        'bg-input max-w-full min-w-0 overflow-hidden rounded-xl border-continuous',
        hasFullWidthContent ? 'w-full self-stretch' : 'self-start'
      )}
      style={
        compactMaxWidth != null ? { maxWidth: compactMaxWidth } : undefined
      }
    >
      {!!displayText && (
        <View className="flex-row max-w-full min-w-0 p-3 gap-2.5">
          <View
            className={cn(
              'w-1 border-continuous rounded-full bg-border self-stretch',
              logColorIndex != null &&
                getSpectrumBackgroundClassName(logColorIndex)
            )}
          />
          <View
            className={cn(!shouldMeasureTextWidth && 'flex-1', 'min-w-0')}
            style={
              compactTextMaxWidth != null
                ? { maxWidth: compactTextMaxWidth }
                : undefined
            }
          >
            <QuotedRecordText text={displayText} />
          </View>
        </View>
      )}
      {!!visualItems.length && (
        <ScrollView
          className="max-w-full grow-0 self-start"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName={cn(
            'px-3 pb-3',
            displayText ? 'pt-0' : 'pt-3'
          )}
        >
          <View className="flex-row gap-0.5">
            {visualItems.map((item) => (
              <QuotedRecordThumb
                key={item.id}
                item={item}
                onPress={openMediaLightbox}
                recordId={recordId}
              />
            ))}
          </View>
        </ScrollView>
      )}
      {hasAudioFiles && (
        <View
          className={cn(
            'gap-2 px-3 pb-3',
            !displayText && !visualItems.length && 'pt-3'
          )}
        >
          <AudioPlaylist canAnalyzeAudio={canAnalyzeAudio} clips={audioMedia} />
        </View>
      )}
      {(hasDocumentFiles || hasLinks) && (
        <View
          className={cn(
            'gap-2 pb-3',
            !displayText && !visualItems.length && !hasAudioFiles && 'pt-3'
          )}
        >
          {hasDocumentFiles && (
            <DocumentAttachments
              documents={documentFiles}
              triggerClassName="px-3"
              triggerIconClassName="-ml-px"
            />
          )}
          {hasLinks && (
            <LinkAttachments
              links={links}
              triggerClassName="px-3"
              triggerIconClassName="-ml-px"
            />
          )}
        </View>
      )}
    </View>
  );

  if (!shouldMeasureTextWidth) return quote;

  return (
    <View className="w-full items-start" onLayout={handleMeasureAvailableWidth}>
      {quote}
    </View>
  );
};

const QuotedRecordText = ({ text }: { text: string }) => (
  <TextContext.Provider value="text-muted-foreground text-sm">
    <TruncatedText
      className="max-w-full text-muted-foreground text-sm shrink"
      expandable={false}
      numberOfLines={QUOTED_TEXT_LINES}
      text={text}
    />
  </TextContext.Provider>
);
