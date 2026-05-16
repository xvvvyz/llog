import { formatFileSize } from '@/features/files/lib/file-size';
import { getFileTypeIcon } from '@/features/files/lib/file-type-icon';
import * as fileUriSources from '@/features/files/lib/file-uri-to-src';
import type { FileItem } from '@/features/files/types/file';
import { cn } from '@/lib/cn';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

export const getDocumentName = (item: { name?: string | null }) =>
  item.name?.trim() || 'Document';

export const getDocumentSizeText = (item: { size?: number | null }) =>
  formatFileSize(item.size) || 'Unknown size';

export const getDocumentSource = (item: FileItem) =>
  fileUriSources.fileUriToSrc(fileUriSources.getFileSourceUri(item));

export const getDocumentIcon = getFileTypeIcon;

export const getTotalSizeText = (
  items: { item: { size?: number | null } }[]
) => {
  const sizes = items
    .map(({ item }) => item.size)
    .filter(
      (size): size is number =>
        Number.isFinite(size) && size != null && size >= 0
    );

  if (!sizes.length) return 'Unknown size';
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const hasUnknownSize = sizes.length !== items.length;
  return `${formatFileSize(total)}${hasUnknownSize ? '+' : ''}`;
};

export const DocumentTextRow = ({
  label,
  trailing,
}: {
  label: React.ReactNode;
  trailing?: React.ReactNode;
}) => (
  <View className="flex-1 flex-row min-w-0 gap-4 items-baseline justify-between">
    <Text
      className="font-normal text-muted-foreground text-sm shrink"
      numberOfLines={1}
    >
      {label}
    </Text>
    {trailing}
  </View>
);

export const DocumentMetaText = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <Text
    className={cn('font-normal text-placeholder text-xs shrink-0', className)}
    numberOfLines={1}
  >
    {children}
  </Text>
);
