import { AudioPlaylist } from '@/features/files/components/audio-player';
import { DocumentAttachments } from '@/features/files/components/document-attachments';
import { useFilteredFiles } from '@/features/files/hooks/use-filtered-files';
import { useMediaLightbox } from '@/features/files/hooks/use-lightbox';
import { isFileAvailableOffline } from '@/features/files/lib/offline-availability';
import * as visualMedia from '@/features/files/lib/visual-media';
import { FileItem } from '@/features/files/types/file';
import { useShowOfflineUi } from '@/features/offline/offline-ui-state';
import { LinkAttachments } from '@/features/records/components/link-attachments';
import { Link } from '@/features/records/types/link';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Spinner } from '@/ui/spinner';
import { Play, WifiSlash } from 'phosphor-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export const ItemFiles = ({
  canAnalyzeAudio,
  files,
  links = [],
  recordId,
}: {
  canAnalyzeAudio: boolean;
  links?: Link[];
  files?: FileItem[];
  recordId?: string;
}) => {
  const {
    audioMedia,
    documentFiles,
    visualMedia: visualItems,
  } = useFilteredFiles(files || []);

  const hasDocumentFiles = documentFiles.length > 0;
  const hasLinks = links.length > 0;
  const showOfflineUi = useShowOfflineUi();
  const { openMediaLightbox } = useMediaLightbox({ recordId });

  if (
    !visualItems.length &&
    !audioMedia.length &&
    !hasDocumentFiles &&
    !hasLinks
  ) {
    return null;
  }

  const timelineTargetWidth = visualMedia.getThumbnailTargetWidth(
    visualItems.length
  );

  const renderMediaThumb = (item: FileItem) => {
    const isProcessing = visualMedia.isProcessing(item);
    const isAvailableOffline = isFileAvailableOffline(item);
    const isUnavailableOffline = showOfflineUi && !isAvailableOffline;

    const canOpenMedia =
      !!recordId && !isProcessing && (!showOfflineUi || isAvailableOffline);

    return (
      <Pressable
        key={item.id}
        className="flex-1"
        disabled={!canOpenMedia}
        onPress={() => {
          if (canOpenMedia) openMediaLightbox(item.id);
        }}
      >
        <Image
          fill
          targetWidth={timelineTargetWidth}
          uri={visualMedia.getThumbnailUri(item)}
          wrapperClassName="rounded-2xl border-continuous"
        />
        {(item.type === 'video' || isUnavailableOffline) && (
          <View className="absolute inset-0 pointer-events-none items-center justify-center">
            {isUnavailableOffline ? (
              <View className="size-10 border-continuous rounded-full bg-background/50 items-center justify-center">
                <Icon
                  className="text-muted-foreground"
                  icon={WifiSlash}
                  size={20}
                />
              </View>
            ) : isProcessing ? (
              <Spinner />
            ) : (
              <View className="size-10 border-continuous rounded-full bg-background/50 items-center justify-center">
                <Icon
                  className="text-foreground"
                  icon={Play}
                  size={20}
                  weight="fill"
                />
              </View>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <React.Fragment>
      {!!visualItems.length && (
        <View className="aspect-[3/2] gap-0.5">
          <View className="flex-1 flex-row gap-0.5">
            {visualItems.slice(0, 3).map(renderMediaThumb)}
          </View>
          {visualItems.length > 3 && (
            <View className="flex-1 flex-row gap-0.5">
              {visualItems.slice(3, 6).map(renderMediaThumb)}
            </View>
          )}
        </View>
      )}
      {audioMedia.length > 0 && (
        <View className="px-4 gap-2">
          <AudioPlaylist canAnalyzeAudio={canAnalyzeAudio} clips={audioMedia} />
        </View>
      )}
      {(hasDocumentFiles || hasLinks) && (
        <View className="gap-2">
          {hasDocumentFiles && (
            <DocumentAttachments
              documents={documentFiles}
              triggerClassName="px-4"
              triggerIconClassName="-ml-px"
            />
          )}
          {hasLinks && (
            <LinkAttachments
              links={links}
              triggerClassName="px-4"
              triggerIconClassName="-ml-px"
            />
          )}
        </View>
      )}
    </React.Fragment>
  );
};
