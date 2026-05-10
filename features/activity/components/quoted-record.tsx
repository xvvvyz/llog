import { AudioPlaylist } from '@/features/files/components/audio-player';
import { DocumentAttachments } from '@/features/files/components/document-attachments';
import { useFilteredFiles } from '@/features/files/hooks/use-filtered-files';
import { useMediaLightbox } from '@/features/files/hooks/use-lightbox';
import * as visualMedia from '@/features/files/lib/visual-media';
import { FileItem } from '@/features/files/types/file';
import { LinkAttachments } from '@/features/records/components/link-attachments';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { Link } from '@/features/records/types/link';
import { cn } from '@/lib/cn';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Play } from 'phosphor-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

export const QuotedRecord = ({
  logColor,
  links = [],
  files,
  recordId,
  text,
}: {
  links?: Link[];
  logColor: { lighter: string; default: string; darker: string } | null;
  files?: FileItem[];
  recordId?: string;
  text?: string;
}) => {
  const {
    audioMedia,
    documentFiles,
    visualMedia: visualItems,
  } = useFilteredFiles(files || []);

  const displayText = trimDisplayText(text);
  const { openMediaLightbox } = useMediaLightbox({ recordId });
  const hasAudioFiles = audioMedia.length > 0;
  const hasDocumentFiles = documentFiles.length > 0;
  const hasLinks = links.length > 0;

  if (
    !displayText &&
    !visualItems.length &&
    !hasAudioFiles &&
    !hasDocumentFiles &&
    !hasLinks
  ) {
    return null;
  }

  return (
    <React.Fragment>
      <View
        className={cn(
          'bg-input max-w-full min-w-0 overflow-hidden rounded-xl border-continuous',
          hasAudioFiles || hasDocumentFiles || hasLinks
            ? 'w-full self-stretch'
            : 'self-start'
        )}
      >
        {!!displayText && (
          <View className="flex-row max-w-full min-w-0 p-3 gap-3">
            <View
              className="w-1 border-continuous rounded-full bg-border self-stretch"
              style={
                logColor ? { backgroundColor: logColor.default } : undefined
              }
            />
            <Text
              className="max-w-full text-muted-foreground text-sm shrink"
              numberOfLines={1}
            >
              {displayText}
            </Text>
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
                <Pressable
                  key={item.id}
                  className="overflow-hidden h-16 w-16 border-continuous rounded-lg shrink-0"
                  disabled={visualMedia.isProcessing(item) || !recordId}
                  onPress={() =>
                    !visualMedia.isProcessing(item) &&
                    openMediaLightbox(item.id)
                  }
                >
                  <Image
                    contentFit="cover"
                    height={64}
                    targetSize={128}
                    uri={visualMedia.getThumbnailUri(item)}
                    width={64}
                  />
                  {item.type === 'video' && (
                    <View className="absolute inset-0 pointer-events-none items-center justify-center">
                      {visualMedia.isProcessing(item) ? (
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
            <AudioPlaylist clips={audioMedia} />
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
    </React.Fragment>
  );
};
