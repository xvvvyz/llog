import { downloadFile } from '@/features/files/lib/download-file';
import { getFileTypeIcon } from '@/features/files/lib/file-type-icon';
import { fileUriToSrc } from '@/features/files/lib/file-uri-to-src';
import type * as fileComposer from '@/features/files/types/composer';
import type { FileItem } from '@/features/files/types/file';
import { alert as showAlert } from '@/lib/alert';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

import {
  SortableGrid,
  SortableSheetDragHandle,
  type SortableGridDragEndParams,
} from '@/ui/sortable';

import {
  Files as DocumentsIcon,
  DownloadSimple,
  X,
} from 'phosphor-react-native';

type DocumentAttachmentItem =
  | { id: string; item: FileItem; order: number; type: 'files' }
  | {
      id: string;
      item: fileComposer.PendingDocumentUpload;
      order: number;
      type: 'pending';
    };

const NO_PENDING_DOCUMENTS: fileComposer.PendingDocumentUpload[] = [];

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
  documents: FileItem[];
  pendingDocuments: fileComposer.PendingDocumentUpload[];
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
      type: 'files',
    });
  }

  return [...byId.values()].sort((a, b) => a.order - b.order);
};

export const DocumentAttachments = ({
  className,
  documents,
  hideTrigger,
  onDeleteFile,
  onRenameFile,
  onReorderFiles,
  onSheetOpenChange,
  pendingDocuments = NO_PENDING_DOCUMENTS,
  portalName,
  sheetOpen,
  triggerClassName,
  triggerIconClassName,
}: {
  className?: string;
  documents: FileItem[];
  hideTrigger?: boolean;
  onDeleteFile?: (fileId: string) => void;
  onRenameFile?: (fileId: string, name: string) => Promise<void>;
  onReorderFiles?: (files: { id: string }[]) => void;
  onSheetOpenChange?: (open: boolean) => void;
  pendingDocuments?: fileComposer.PendingDocumentUpload[];
  portalName?: string;
  sheetOpen?: boolean;
  triggerClassName?: string;
  triggerIconClassName?: string;
}) => {
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const [localSheetOpen, setLocalSheetOpen] = React.useState(false);

  const [editingDocument, setEditingDocument] = React.useState<FileItem | null>(
    null
  );

  const [editingName, setEditingName] = React.useState('');
  const [isRenaming, setIsRenaming] = React.useState(false);

  const [downloadingDocumentIds, setDownloadingDocumentIds] = React.useState(
    () => new Set<string>()
  );

  const sheetId = React.useId();
  const isSheetOpen = sheetOpen ?? localSheetOpen;

  const sheetPortalName = React.useMemo(
    () => portalName ?? `document-attachments-${sheetId.replace(/:/g, '')}`,
    [portalName, sheetId]
  );

  const nameEditorPortalName = React.useMemo(
    () => `${sheetPortalName}-name-editor`,
    [sheetPortalName]
  );

  const setIsSheetOpen = React.useCallback(
    (open: boolean) => {
      onSheetOpenChange?.(open);
      if (sheetOpen === undefined) setLocalSheetOpen(open);
    },
    [onSheetOpenChange, sheetOpen]
  );

  const items = React.useMemo(
    () => getDocumentAttachmentItems({ documents, pendingDocuments }),
    [documents, pendingDocuments]
  );

  const totalSizeText = React.useMemo(() => getTotalSizeText(items), [items]);
  const firstItem = items[0];

  const singleMediaItem =
    items.length === 1 && firstItem?.type === 'files' ? firstItem.item : null;

  const hasPendingDocuments = pendingDocuments.length > 0;
  const canOpenSingleDocument = !!singleMediaItem && !onDeleteFile;
  const canDeleteSingleDocument = !!onDeleteFile && items.length === 1;

  const canSortDocuments =
    !!onReorderFiles &&
    items.length > 1 &&
    items.every((item) => item.type === 'files');

  const shouldRenderSheet =
    !canDeleteSingleDocument || hideTrigger || isSheetOpen;

  const showSummarySize = items.length === 1;
  const firstDocumentName = firstItem ? getDocumentName(firstItem.item) : null;

  const firstDocumentIcon = firstItem
    ? getFileTypeIcon(firstItem.item)
    : DocumentsIcon;

  const trimmedEditingName = editingName.trim();

  const canRenameDocument =
    !!editingDocument && !!onRenameFile && !!trimmedEditingName;

  const singleDocumentSizeText = singleMediaItem
    ? getDocumentSizeText(singleMediaItem)
    : null;

  const moreDocumentsText =
    items.length > 1 ? `+${items.length - 1} more` : null;

  const handleOpenDocument = React.useCallback(async (item: FileItem) => {
    const src = fileUriToSrc(item.uri);
    if (!src) return;
    setDownloadingDocumentIds((current) => new Set(current).add(item.id));

    try {
      await downloadFile({
        fileName: getDocumentName(item),
        mimeType: item.mimeType ?? undefined,
        url: src,
      });
    } catch {
      showAlert({
        message: 'Could not download this document.',
        title: 'Document unavailable',
      });
    } finally {
      setDownloadingDocumentIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }, []);

  const handleOpenSheet = React.useCallback(() => {
    setIsSheetOpen(true);
  }, [setIsSheetOpen]);

  const handleOpenNameEditor = React.useCallback(
    (item: FileItem) => {
      if (!onRenameFile) return;
      setEditingDocument(item);
      setEditingName(getDocumentName(item));
    },
    [onRenameFile]
  );

  const handleCloseNameEditor = React.useCallback(() => {
    if (isRenaming) return;
    setEditingDocument(null);
    setEditingName('');
  }, [isRenaming]);

  const handleDeleteDocument = React.useCallback(
    (fileId: string) => {
      onDeleteFile?.(fileId);
      if (items.length <= 1) setIsSheetOpen(false);
    },
    [items.length, onDeleteFile]
  );

  const handleDragEnd = React.useCallback(
    (params: SortableGridDragEndParams<DocumentAttachmentItem>) => {
      if (params.fromIndex === params.toIndex) return;

      const orderedFiles = params.data.flatMap((item) =>
        item.type === 'files' ? [item.item] : []
      );

      if (orderedFiles.length !== params.data.length) return;
      onReorderFiles?.(orderedFiles);
    },
    [onReorderFiles]
  );

  const handleRenameDocument = React.useCallback(async () => {
    if (!editingDocument || !onRenameFile || !trimmedEditingName) return;
    setIsRenaming(true);

    try {
      await onRenameFile(editingDocument.id, trimmedEditingName);
      setEditingDocument(null);
      setEditingName('');
    } catch {
      showAlert({
        message: 'Could not rename this document.',
        title: 'Document unavailable',
      });
    } finally {
      setIsRenaming(false);
    }
  }, [editingDocument, onRenameFile, trimmedEditingName]);

  React.useEffect(() => {
    if (!editingDocument) return;

    const stillExists = items.some(
      (item) => item.type === 'files' && item.item.id === editingDocument.id
    );

    if (stillExists) return;
    setEditingDocument(null);
    setEditingName('');
  }, [editingDocument, items]);

  React.useEffect(() => {
    setDownloadingDocumentIds((current) => {
      const fileIds = new Set(
        items
          .filter((item) => item.type === 'files')
          .map((item) => item.item.id)
      );

      const next = new Set(
        [...current].filter((fileId) => fileIds.has(fileId))
      );

      if (
        next.size === current.size &&
        [...current].every((fileId) => next.has(fileId))
      ) {
        return current;
      }

      return next;
    });
  }, [items]);

  const renderSheetItem = (previewItem: DocumentAttachmentItem) => {
    const item = previewItem.item;
    const DocumentIcon = getFileTypeIcon(item);

    const documentDetails = (
      <View className="flex-1 flex-row min-w-0 gap-4 items-center justify-between">
        <View className="flex-1 flex-row min-w-0 gap-2 items-center">
          <Icon className="text-placeholder" icon={DocumentIcon} />
          <Text
            className="text-muted-foreground text-sm shrink"
            numberOfLines={1}
          >
            {getDocumentName(item)}
          </Text>
        </View>
        <Text className="text-placeholder text-xs shrink-0" numberOfLines={1}>
          {getDocumentSizeText(item)}
        </Text>
      </View>
    );

    const dragHandle =
      canSortDocuments && previewItem.type === 'files' ? (
        <SortableSheetDragHandle className="-ml-1.5" />
      ) : null;

    if (previewItem.type === 'files') {
      if (onDeleteFile) {
        return (
          <View key={previewItem.id} className="flex-row gap-3 items-center">
            {dragHandle}
            {onRenameFile ? (
              <Button
                className="flex-1 flex-row min-w-0 justify-start"
                onPress={() => handleOpenNameEditor(item)}
                variant="link"
                wrapperClassName="flex-1 overflow-visible rounded-lg"
              >
                {documentDetails}
              </Button>
            ) : (
              documentDetails
            )}
            <Button
              accessibilityLabel={`Remove ${getDocumentName(item)}`}
              onPress={() => handleDeleteDocument(previewItem.item.id)}
              size="icon-sm"
              variant="ghost"
              wrapperClassName="-mr-1.5"
            >
              <Icon icon={X} />
            </Button>
          </View>
        );
      }

      return (
        <View key={previewItem.id} className="flex-row gap-3 items-center">
          {documentDetails}
          <Button
            accessibilityLabel={`Download ${getDocumentName(item)}`}
            disabled={downloadingDocumentIds.has(item.id)}
            size="icon-sm"
            variant="ghost"
            wrapperClassName="-mr-1.5"
            onPress={() => {
              void handleOpenDocument(previewItem.item);
            }}
          >
            {downloadingDocumentIds.has(item.id) ? (
              <Spinner size="xs" />
            ) : (
              <Icon className="text-muted-foreground" icon={DownloadSimple} />
            )}
          </Button>
        </View>
      );
    }

    return (
      <View
        key={previewItem.id}
        className="flex-row opacity-70 gap-3 items-center"
      >
        {documentDetails}
        <View className="-mr-1.5 size-8 items-center justify-center">
          <Spinner size="xs" />
        </View>
      </View>
    );
  };

  if (!items.length) return null;

  return (
    <View className={cn('gap-2', className)}>
      {hideTrigger ? null : canDeleteSingleDocument && firstItem ? (
        <View
          className={cn(
            'flex-row w-full gap-3 justify-between px-4',
            firstItem.type === 'pending' && 'opacity-70',
            triggerClassName
          )}
        >
          {firstItem.type === 'files' && onRenameFile ? (
            <Button
              className="flex-1 flex-row min-w-0 gap-4 justify-between"
              onPress={() => handleOpenNameEditor(firstItem.item)}
              variant="link"
              wrapperClassName="flex-1 overflow-visible rounded-lg"
            >
              <View className="flex-1 flex-row min-w-0 gap-2 items-center">
                <Icon
                  className={cn('text-placeholder', triggerIconClassName)}
                  icon={firstDocumentIcon}
                />
                <Text
                  className="font-normal text-muted-foreground text-sm shrink"
                  numberOfLines={1}
                >
                  {firstDocumentName}
                </Text>
              </View>
              <Text
                className="font-normal text-placeholder text-xs self-center shrink-0"
                numberOfLines={1}
              >
                {getDocumentSizeText(firstItem.item)}
              </Text>
            </Button>
          ) : (
            <>
              <View className="flex-1 flex-row min-w-0 gap-2 items-center">
                <Icon
                  className={cn('text-placeholder', triggerIconClassName)}
                  icon={firstDocumentIcon}
                />
                <Text
                  className="font-normal text-muted-foreground text-sm shrink"
                  numberOfLines={1}
                >
                  {firstDocumentName}
                </Text>
              </View>
              <Text
                className="font-normal text-placeholder text-xs self-center shrink-0"
                numberOfLines={1}
              >
                {getDocumentSizeText(firstItem.item)}
              </Text>
            </>
          )}
          <View className="flex-row gap-2 items-center shrink-0">
            {firstItem.type === 'files' ? (
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
                <Spinner size="xs" />
              </View>
            )}
          </View>
        </View>
      ) : canOpenSingleDocument ? (
        <Button
          disabled={downloadingDocumentIds.has(singleMediaItem.id)}
          onPress={() => void handleOpenDocument(singleMediaItem)}
          variant="link"
          wrapperClassName="w-full overflow-visible rounded-lg"
          className={cn(
            'flex-row w-full gap-4 justify-between px-4',
            triggerClassName
          )}
        >
          <View className="flex-1 flex-row min-w-0 gap-2 items-center">
            {downloadingDocumentIds.has(singleMediaItem.id) ? (
              <Spinner className={triggerIconClassName} size="xs" />
            ) : (
              <Icon
                className={cn('text-placeholder', triggerIconClassName)}
                icon={firstDocumentIcon}
              />
            )}
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
          onPress={handleOpenSheet}
          variant="link"
          wrapperClassName="w-full overflow-visible rounded-lg"
          className={cn(
            'flex-row w-full gap-4 justify-between px-4',
            triggerClassName
          )}
        >
          <View className="flex-1 flex-row min-w-0 gap-2 items-center">
            <Icon
              className={cn('text-placeholder', triggerIconClassName)}
              icon={items.length === 1 ? firstDocumentIcon : DocumentsIcon}
            />
            <Text
              className="font-normal text-muted-foreground text-sm shrink"
              numberOfLines={1}
            >
              {firstDocumentName}
            </Text>
          </View>
          {moreDocumentsText ? (
            <View className="flex-row gap-2 items-center shrink-0">
              <Text
                className="font-normal text-placeholder text-xs"
                numberOfLines={1}
              >
                {moreDocumentsText}
              </Text>
              {hasPendingDocuments && <Spinner size="xs" />}
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
      {shouldRenderSheet && (
        <Sheet
          onDismiss={() => setIsSheetOpen(false)}
          open={isSheetOpen}
          portalName={sheetPortalName}
          variant="list"
        >
          <SheetListScrollView ref={scrollViewRef}>
            {canSortDocuments ? (
              <SortableGrid
                autoScrollDirection="vertical"
                columns={1}
                data={items}
                onDragEnd={handleDragEnd}
                renderItem={({ item }) => renderSheetItem(item)}
                rowGap={0}
                scrollableRef={scrollViewRef}
              />
            ) : (
              items.map(renderSheetItem)
            )}
          </SheetListScrollView>
          <SheetFooter contentClassName="flex-row gap-4">
            <Button
              onPress={() => setIsSheetOpen(false)}
              size="sm"
              variant="secondary"
              wrapperClassName="flex-1"
            >
              <Text>Close</Text>
            </Button>
          </SheetFooter>
        </Sheet>
      )}
      {!!onRenameFile && (
        <Sheet
          className="md:max-w-sm"
          onDismiss={handleCloseNameEditor}
          open={!!editingDocument}
          portalName={nameEditorPortalName}
          topInset={64}
        >
          <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 md:p-8">
            <View>
              <Label>Name</Label>
              <Input
                autoFocus
                maxLength={255}
                onChangeText={setEditingName}
                placeholder="Document"
                value={editingName}
                onSubmitEditing={() => {
                  if (canRenameDocument) void handleRenameDocument();
                }}
              />
            </View>
            <View className="flex-row mt-8 gap-4">
              <Button
                disabled={isRenaming}
                onPress={handleCloseNameEditor}
                size="sm"
                variant="secondary"
                wrapperClassName="flex-1"
              >
                <Text>Cancel</Text>
              </Button>
              <Button
                disabled={!canRenameDocument || isRenaming}
                onPress={handleRenameDocument}
                size="sm"
                wrapperClassName="flex-1"
              >
                <Text>{isRenaming ? 'Saving...' : 'Save'}</Text>
              </Button>
            </View>
          </View>
        </Sheet>
      )}
    </View>
  );
};
