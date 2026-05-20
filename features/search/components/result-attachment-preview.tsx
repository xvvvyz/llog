import { getFileTypeIcon } from '@/features/files/lib/file-type-icon';
import * as visualMedia from '@/features/files/lib/visual-media';
import type * as search from '@/features/search/types/search';
import { durationMsToSeconds } from '@/lib/duration';
import { formatCompactDuration } from '@/lib/format-time';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Text } from '@/ui/text';
import { FileAudio, Link as LinkIcon, Play } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';

const MAX_VISUAL_PREVIEWS = 6;

const getAttachmentLabel = (file: search.SearchFileItem) => {
  if (file.type === 'audio') {
    const duration = formatCompactDuration(durationMsToSeconds(file.duration));
    if (duration) return `${duration} audio`;
  }

  const name = file.name?.trim();
  if (name) return name;
  if (file.type === 'audio') return 'Audio';
  if (file.type === 'document') return 'Document';
  if (file.type === 'video') return 'Video';
  return 'Image';
};

const isVisualFile = (file: search.SearchFileItem) =>
  file.type === 'image' || file.type === 'video';

const INLINE_FILE_TYPE_ORDER = { audio: 0, document: 1 } as const;

const byInlineFileType = (
  a: search.SearchFileItem,
  b: search.SearchFileItem
) => {
  const getOrder = (type?: string | null) =>
    type && type in INLINE_FILE_TYPE_ORDER
      ? INLINE_FILE_TYPE_ORDER[type as keyof typeof INLINE_FILE_TYPE_ORDER]
      : 2;

  return getOrder(a.type) - getOrder(b.type);
};

const getLinkLabel = (link: search.SearchLinkItem) =>
  link.label?.trim() || link.url?.trim() || 'Link';

export const hasResultAttachmentPreview = ({
  files,
  links,
}: {
  files?: search.SearchFileItem[];
  links?: search.SearchLinkItem[];
}) =>
  !!(
    files?.some((file) => !!file.type) ||
    links?.some((link) => link.label?.trim() || link.url?.trim())
  );

const InlineTile = ({
  icon,
  label,
}: {
  icon: React.ComponentType<PhosphorIconProps>;
  label: string;
}) => (
  <View className="flex-row -my-0.5 max-w-32 min-w-0 w-fit gap-1 items-center shrink">
    <Icon className="text-muted-foreground shrink-0" icon={icon} size={14} />
    <Text
      className="min-w-0 leading-tight text-muted-foreground text-xs shrink"
      numberOfLines={1}
    >
      {label}
    </Text>
  </View>
);

const LinkTile = ({ link }: { link: search.SearchLinkItem }) => (
  <InlineTile icon={LinkIcon} label={getLinkLabel(link)} />
);

const AttachmentTile = ({ file }: { file: search.SearchFileItem }) => {
  if (isVisualFile(file)) {
    const isVideo = file.type === 'video';
    const thumbnailUri = visualMedia.getThumbnailUri(file);

    return (
      <View className="overflow-hidden size-8 rounded-md bg-border">
        <Image fill targetWidth={64} uri={thumbnailUri} />
        {isVideo && (
          <View className="absolute inset-0 bg-black/10 items-center justify-center">
            <Icon
              className="text-foreground"
              icon={Play}
              size={14}
              weight="fill"
            />
          </View>
        )}
      </View>
    );
  }

  const FileIcon = file.type === 'audio' ? FileAudio : getFileTypeIcon(file);
  return <InlineTile icon={FileIcon} label={getAttachmentLabel(file)} />;
};

export const ResultAttachmentPreview = ({
  files,
  links,
}: {
  files?: search.SearchFileItem[];
  links?: search.SearchLinkItem[];
}) => {
  const previewFiles = React.useMemo(
    () => (files ?? []).filter((file) => !!file.type),
    [files]
  );

  const previewLinks = React.useMemo(
    () =>
      (links ?? []).filter((link) => link.label?.trim() || link.url?.trim()),
    [links]
  );

  if (!previewFiles.length && !previewLinks.length) return null;
  const visualFiles = previewFiles.filter(isVisualFile);

  const inlineFiles = previewFiles
    .filter((file) => !isVisualFile(file))
    .sort(byInlineFileType);

  const visibleVisualFiles = visualFiles.slice(0, MAX_VISUAL_PREVIEWS);
  const remainingVisualCount = visualFiles.length - visibleVisualFiles.length;
  const hasInlineAttachments = !!(inlineFiles.length || previewLinks.length);

  return (
    <View className="min-w-0 gap-3">
      {!!visibleVisualFiles.length && (
        <View className="flex-row gap-3 items-center">
          <View className="flex-row gap-1 items-center">
            {visibleVisualFiles.map((file) => (
              <AttachmentTile key={file.id} file={file} />
            ))}
          </View>
          {remainingVisualCount > 0 && (
            <View className="h-8 justify-center">
              <Text className="leading-tight text-muted-foreground text-xs">
                +{remainingVisualCount}
              </Text>
            </View>
          )}
        </View>
      )}
      {hasInlineAttachments && (
        <View className="flex-row flex-wrap min-w-0 gap-3 items-center">
          {inlineFiles.map((file) => (
            <View key={file.id} className="min-w-0 shrink">
              <AttachmentTile file={file} />
            </View>
          ))}
          {previewLinks.map((link) => (
            <View key={link.id} className="min-w-0 shrink">
              <LinkTile link={link} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
