import { fileUriToSrc } from '@/features/media/lib/file-uri-to-src';
import type * as mediaComposer from '@/features/media/types/composer';
import type { Media } from '@/features/media/types/media';
import { alert as showAlert } from '@/lib/alert';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { Linking, ScrollView, View } from 'react-native';

import {
  Files as DocumentsIcon,
  DownloadSimple,
  FileText,
  X,
} from 'phosphor-react-native';

type DocumentAttachmentItem =
  | { id: string; item: Media; order: number; type: 'media' }
  | {
      id: string;
      item: mediaComposer.PendingDocumentUpload;
      order: number;
      type: 'pending';
    };

const NO_PENDING_DOCUMENTS: mediaComposer.PendingDocumentUpload[] = [];

const getDocumentName = (item: { name?: string | null }) =>
  item.name?.trim() || 'Document';

const formatDocumentSize = (size?: number | null) => {
  if (!Number.isFinite(size) || size == null || size < 0) return null;
  if (size < 1024) return `${Math.round(size)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

const getDocumentSizeText = (item: { size?: number | null }) =>
  formatDocumentSize(item.size) || 'Unknown size';

const getTotalSizeText = (items: DocumentAttachmentItem[]) => {
  const sizes = items
    .map(({ item }) => item.size)
    .filter(
      (size): size is number =>
        Number.isFinite(size) && size != null && size >= 0
    );

  if (!sizes.length) return 'Unknown size';
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const hasUnknownSize = sizes.length !== items.length;
  return `${formatDocumentSize(total)}${hasUnknownSize ? '+' : ''}`;
};

const getDocumentAttachmentItems = ({
  documents,
  pendingDocuments,
}: {
  documents: Media[];
  pendingDocuments: mediaComposer.PendingDocumentUpload[];
}) => {
  const byId = new Map<string, DocumentAttachmentItem>();

  for (const item of pendingDocuments) {
    byId.set(item.id, {
      id: item.id,
      item,
      order: item.order,
      type: 'pending',
    });
  }

  for (const item of documents) {
    byId.set(item.id, {
      id: item.id,
      item,
      order: item.order ?? 0,
      type: 'media',
    });
  }

  return [...byId.values()].sort((a, b) => a.order - b.order);
};

export const DocumentAttachments = ({
  className,
  triggerClassName,
  triggerIconClassName,
  documents,
  onDeleteMedia,
  pendingDocuments = NO_PENDING_DOCUMENTS,
}: {
  className?: string;
  documents: Media[];
  onDeleteMedia?: (mediaId: string) => void;
  pendingDocuments?: mediaComposer.PendingDocumentUpload[];
  triggerClassName?: string;
  triggerIconClassName?: string;
}) => {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const sheetId = React.useId();

  const sheetPortalName = React.useMemo(
    () => `document-attachments-${sheetId.replace(/:/g, '')}`,
    [sheetId]
  );

  const items = React.useMemo(
    () => getDocumentAttachmentItems({ documents, pendingDocuments }),
    [documents, pendingDocuments]
  );

  const totalSizeText = React.useMemo(() => getTotalSizeText(items), [items]);
  const firstItem = items[0];

  const singleMediaItem =
    items.length === 1 && firstItem?.type === 'media' ? firstItem.item : null;

  const canOpenSingleDocument = !!singleMediaItem && !onDeleteMedia;
  const canDeleteSingleDocument = !!onDeleteMedia && items.length === 1;
  const showSummarySize = items.length === 1;
  const firstDocumentName = firstItem ? getDocumentName(firstItem.item) : null;

  const singleDocumentSizeText = singleMediaItem
    ? getDocumentSizeText(singleMediaItem)
    : null;

  const moreDocumentsText =
    items.length > 1 ? `+${items.length - 1} more` : null;

  const handleOpenDocument = React.useCallback(async (item: Media) => {
    const src = fileUriToSrc(item.uri);
    if (!src) return;

    try {
      await Linking.openURL(src);
    } catch {
      showAlert({
        message: 'Could not open this document.',
        title: 'Document unavailable',
      });
    }
  }, []);

  const handleDeleteDocument = React.useCallback(
    (mediaId: string) => {
      onDeleteMedia?.(mediaId);
      if (items.length <= 1) setIsSheetOpen(false);
    },
    [items.length, onDeleteMedia]
  );

  if (!items.length) return null;

  return (
    <View className={cn('gap-2', className)}>
      {canDeleteSingleDocument && firstItem ? (
        <View
          className={cn(
            'flex-row h-8 w-full -my-2.5 gap-4 justify-between px-4',
            firstItem.type === 'pending' && 'opacity-70',
            triggerClassName
          )}
        >
          <View className="flex-1 flex-row min-w-0 gap-2 items-center">
            <Icon
              className={cn('text-placeholder', triggerIconClassName)}
              icon={FileText}
            />
            <Text
              className="font-normal text-muted-foreground text-sm shrink"
              numberOfLines={1}
            >
              {firstDocumentName}
            </Text>
          </View>
          <View className="flex-row gap-2 items-center shrink-0">
            <Text
              className="font-normal text-placeholder text-xs"
              numberOfLines={1}
            >
              {getDocumentSizeText(firstItem.item)}
            </Text>
            {firstItem.type === 'media' ? (
              <Button
                accessibilityLabel={`Remove ${getDocumentName(firstItem.item)}`}
                onPress={() => handleDeleteDocument(firstItem.item.id)}
                size="icon-sm"
                variant="ghost"
                wrapperClassName="-mr-1.5"
              >
                <Icon icon={X} />
              </Button>
            ) : (
              <View className="-mr-1.5 size-8 items-center justify-center">
                <Spinner className="scale-[0.8]" size="small" />
              </View>
            )}
          </View>
        </View>
      ) : canOpenSingleDocument ? (
        <Button
          onPress={() => void handleOpenDocument(singleMediaItem)}
          variant="link"
          wrapperClassName="w-full overflow-visible rounded-lg"
          className={cn(
            'flex-row h-8 w-full -my-2.5 gap-4 justify-between px-4',
            triggerClassName
          )}
        >
          <View className="flex-1 flex-row min-w-0 gap-2 items-center">
            <Icon
              className={cn('text-placeholder', triggerIconClassName)}
              icon={DownloadSimple}
            />
            <Text
              className="font-normal text-muted-foreground text-sm shrink"
              numberOfLines={1}
            >
              {firstDocumentName}
            </Text>
          </View>
          <View className="flex-row gap-2 items-center shrink-0">
            <Text
              className="font-normal text-placeholder text-xs"
              numberOfLines={1}
            >
              {singleDocumentSizeText}
            </Text>
          </View>
        </Button>
      ) : (
        <Button
          onPress={() => setIsSheetOpen(true)}
          variant="link"
          wrapperClassName="w-full overflow-visible rounded-lg"
          className={cn(
            'flex-row h-8 w-full -my-2.5 gap-4 justify-between px-4',
            triggerClassName
          )}
        >
          <View className="flex-1 flex-row min-w-0 gap-2 items-center">
            <Icon
              className={cn('text-placeholder', triggerIconClassName)}
              icon={DocumentsIcon}
            />
            <Text
              className="font-normal text-muted-foreground text-sm shrink"
              numberOfLines={1}
            >
              {firstDocumentName}
            </Text>
          </View>
          {moreDocumentsText ? (
            <View className="shrink-0">
              <Text
                className="font-normal text-placeholder text-sm"
                numberOfLines={1}
              >
                {moreDocumentsText}
              </Text>
            </View>
          ) : (
            showSummarySize && (
              <View className="shrink-0">
                <Text
                  className="font-normal text-placeholder text-xs"
                  numberOfLines={1}
                >
                  {totalSizeText}
                </Text>
              </View>
            )
          )}
        </Button>
      )}
      {!canDeleteSingleDocument && (
        <Sheet
          onDismiss={() => setIsSheetOpen(false)}
          open={isSheetOpen}
          portalName={sheetPortalName}
        >
          <ScrollView
            className="-mx-px max-h-[19rem] min-h-0 border-b border-border-secondary border-x rounded-b-4xl"
            contentContainerClassName="mx-auto w-full max-w-lg px-8 py-5"
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {items.map((previewItem) => {
              const item = previewItem.item;

              const documentDetails = (
                <View className="flex-1 flex-row min-w-0 gap-4 items-center justify-between">
                  <View className="flex-1 flex-row min-w-0 gap-2 items-center">
                    <Icon className="text-placeholder" icon={FileText} />
                    <Text
                      className="text-muted-foreground text-sm shrink"
                      numberOfLines={1}
                    >
                      {getDocumentName(item)}
                    </Text>
                  </View>
                  <Text
                    className="text-placeholder text-xs shrink-0"
                    numberOfLines={1}
                  >
                    {getDocumentSizeText(item)}
                  </Text>
                </View>
              );

              if (previewItem.type === 'media') {
                if (onDeleteMedia) {
                  return (
                    <View
                      key={previewItem.id}
                      className="flex-row gap-4 items-center"
                    >
                      {documentDetails}
                      <Button
                        accessibilityLabel={`Remove ${getDocumentName(item)}`}
                        size="icon-sm"
                        variant="ghost"
                        wrapperClassName="-mr-1.5"
                        onPress={() =>
                          handleDeleteDocument(previewItem.item.id)
                        }
                      >
                        <Icon icon={X} />
                      </Button>
                    </View>
                  );
                }

                return (
                  <View
                    key={previewItem.id}
                    className="flex-row gap-4 items-center"
                  >
                    {documentDetails}
                    <Button
                      accessibilityLabel={`Download ${getDocumentName(item)}`}
                      size="icon-sm"
                      variant="ghost"
                      wrapperClassName="-mr-1.5"
                      onPress={() => {
                        setIsSheetOpen(false);
                        void handleOpenDocument(previewItem.item);
                      }}
                    >
                      <Icon
                        className="text-muted-foreground"
                        icon={DownloadSimple}
                      />
                    </Button>
                  </View>
                );
              }

              return (
                <View
                  key={previewItem.id}
                  className="flex-row opacity-70 gap-4 items-center"
                >
                  {documentDetails}
                  <View className="-mr-1.5 size-8 items-center justify-center">
                    <Spinner className="scale-[0.8]" size="small" />
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View>
            <View className="flex-row mx-auto max-w-lg w-full px-8 py-4 gap-4">
              <Button
                onPress={() => setIsSheetOpen(false)}
                size="sm"
                variant="secondary"
                wrapperClassName="flex-1"
              >
                <Text>Close</Text>
              </Button>
            </View>
          </View>
        </Sheet>
      )}
    </View>
  );
};
