import * as attachmentItems from '@/features/files/lib/attachment-items';
import { downloadFile } from '@/features/files/lib/download-file';
import { formatFileSize } from '@/features/files/lib/file-size';
import { getFileTypeIcon } from '@/features/files/lib/file-type-icon';
import * as fileUriSources from '@/features/files/lib/file-uri-to-src';
import type * as fileComposer from '@/features/files/types/composer';
import type { FileItem } from '@/features/files/types/file';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Field } from '@/ui/field';
import { Icon } from '@/ui/icon';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import * as Sortable from '@/ui/sortable';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Files as DocumentsIcon, X } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

type DocumentAttachmentItem = attachmentItems.AttachmentPreviewItem<
  FileItem,
  fileComposer.PendingDocumentUpload
>;

const NO_PENDING_DOCUMENTS: fileComposer.PendingDocumentUpload[] = [];

const getDocumentName = (item: { name?: string | null }) =>
  item.name?.trim() || 'Document';

const getDocumentSizeText = (item: { size?: number | null }) =>
  formatFileSize(item.size) || 'Unknown size';

const getDocumentSource = (item: FileItem) =>
  fileUriSources.fileUriToSrc(fileUriSources.getFileSourceUri(item));

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
  return `${formatFileSize(total)}${hasUnknownSize ? '+' : ''}`;
};

const DocumentTextRow = ({
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

const DocumentMetaText = ({
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

export const DocumentAttachments = ({
  actionsDisabled,
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
  actionsDisabled?: boolean;
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
  const colorScheme = useColorScheme();
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
  const placeholderColor = UI[colorScheme].placeholder;

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
    () =>
      attachmentItems.getAttachmentPreviewItems({
        files: documents,
        pending: pendingDocuments,
      }),
    [documents, pendingDocuments]
  );

  const totalSizeText = React.useMemo(() => getTotalSizeText(items), [items]);
  const firstItem = items[0];

  const hasUploadingPendingDocuments = pendingDocuments.some(
    (item) => item.status === 'uploading'
  );

  const canDeleteSingleDocument = !!onDeleteFile && items.length === 1;
  const shouldOpenDocumentsInline = !onDeleteFile;
  const canRenameDocuments = !!onRenameFile && !actionsDisabled;

  const canSortDocumentSet =
    !!onReorderFiles &&
    items.length > 1 &&
    items.every((item) => item.kind === 'file');

  const canSortDocuments = canSortDocumentSet && !actionsDisabled;

  const shouldRenderSheet =
    !shouldOpenDocumentsInline &&
    (!canDeleteSingleDocument || hideTrigger || isSheetOpen);

  const showSummarySize = items.length === 1;
  const firstDocumentName = firstItem ? getDocumentName(firstItem.item) : null;

  const firstDocumentIcon = firstItem
    ? getFileTypeIcon(firstItem.item)
    : DocumentsIcon;

  const trimmedEditingName = editingName.trim();

  const canRenameDocument =
    !!editingDocument && canRenameDocuments && !!trimmedEditingName;

  const moreDocumentsText =
    items.length > 1 ? `+${items.length - 1} more` : null;

  const handleOpenDocument = React.useCallback(async (item: FileItem) => {
    const src = getDocumentSource(item);
    if (!src) return;
    setDownloadingDocumentIds((current) => new Set(current).add(item.id));

    try {
      await downloadFile({
        fileName: getDocumentName(item),
        mimeType: item.mimeType ?? undefined,
        url: src,
      });
    } catch {
      // noop
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
      if (actionsDisabled) return;
      if (!canRenameDocuments) return;
      setEditingDocument(item);
      setEditingName(getDocumentName(item));
    },
    [actionsDisabled, canRenameDocuments]
  );

  const handleCloseNameEditor = React.useCallback(() => {
    if (isRenaming) return;
    setEditingDocument(null);
    setEditingName('');
  }, [isRenaming]);

  const handleDeleteDocument = React.useCallback(
    (fileId: string) => {
      if (actionsDisabled) return;
      onDeleteFile?.(fileId);
      if (items.length <= 1) setIsSheetOpen(false);
    },
    [actionsDisabled, items.length, onDeleteFile, setIsSheetOpen]
  );

  const handleDragEnd = React.useCallback(
    (params: Sortable.SortableGridDragEndParams<DocumentAttachmentItem>) => {
      if (params.fromIndex === params.toIndex) return;

      const orderedFiles = params.data.flatMap((item) =>
        item.kind === 'file' ? [item.item] : []
      );

      if (orderedFiles.length !== params.data.length) return;
      onReorderFiles?.(orderedFiles);
    },
    [onReorderFiles]
  );

  const handleRenameDocument = React.useCallback(async () => {
    if (!canRenameDocument || !editingDocument || !onRenameFile) return;
    setIsRenaming(true);

    try {
      await onRenameFile(editingDocument.id, trimmedEditingName);
      setEditingDocument(null);
      setEditingName('');
    } catch {
      // noop
    } finally {
      setIsRenaming(false);
    }
  }, [canRenameDocument, editingDocument, onRenameFile, trimmedEditingName]);

  React.useEffect(() => {
    if (!editingDocument) return;

    const stillExists = items.some(
      (item) => item.kind === 'file' && item.item.id === editingDocument.id
    );

    if (stillExists) return;
    setEditingDocument(null);
    setEditingName('');
  }, [editingDocument, items]);

  React.useEffect(() => {
    setDownloadingDocumentIds((current) => {
      const fileIds = new Set(
        items.filter((item) => item.kind === 'file').map((item) => item.item.id)
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

    const documentSource =
      previewItem.kind === 'file' ? getDocumentSource(item) : null;

    const canOpenDocument = previewItem.kind === 'file' && !!documentSource;

    const isDownloading =
      previewItem.kind === 'file' && downloadingDocumentIds.has(item.id);

    const isUploading =
      previewItem.kind === 'pending' && previewItem.item.status === 'uploading';

    const canDeleteDocument = !!onDeleteFile && !actionsDisabled;

    const documentDetails = (
      <View className="flex-1 flex-row min-w-0 gap-2 items-center">
        {isDownloading ? (
          <Spinner color={placeholderColor} size="xs" />
        ) : (
          <Icon className="text-placeholder" icon={DocumentIcon} />
        )}
        <DocumentTextRow
          label={getDocumentName(item)}
          trailing={
            <DocumentMetaText>{getDocumentSizeText(item)}</DocumentMetaText>
          }
        />
      </View>
    );

    const dragHandle =
      canSortDocumentSet && previewItem.kind === 'file' ? (
        <Sortable.SortableSheetDragHandle
          className="-ml-1.5 mr-1"
          disabled={!canSortDocuments}
        />
      ) : null;

    const renameableDocument =
      canRenameDocuments && previewItem.kind === 'file';

    if (previewItem.kind === 'file') {
      if (onDeleteFile) {
        return (
          <View key={previewItem.id} className="flex-row items-center">
            {dragHandle}
            {renameableDocument ? (
              <Button
                className="flex-1 flex-row min-w-0 justify-start"
                disabled={actionsDisabled}
                onPress={() => handleOpenNameEditor(previewItem.item)}
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
              disabled={!canDeleteDocument}
              onPress={() => handleDeleteDocument(previewItem.item.id)}
              size="icon-xs"
              variant="ghost"
              wrapperClassName="ml-2 -mr-1.5"
            >
              <Icon icon={X} />
            </Button>
          </View>
        );
      }

      return (
        <Button
          key={previewItem.id}
          className="flex-row w-full justify-start"
          disabled={downloadingDocumentIds.has(item.id) || !canOpenDocument}
          variant="link"
          wrapperClassName="w-full overflow-visible rounded-lg"
          onPress={() => {
            void handleOpenDocument(previewItem.item);
          }}
        >
          {documentDetails}
        </Button>
      );
    }

    return (
      <View
        key={previewItem.id}
        className="flex-row opacity-70 gap-2 items-center"
      >
        {documentDetails}
        {isUploading && <Spinner size="xs" />}
        {!!onDeleteFile && (
          <Button
            accessibilityLabel={`Remove ${getDocumentName(item)}`}
            disabled={!canDeleteDocument}
            onPress={() => handleDeleteDocument(item.id)}
            size="icon-xs"
            variant="ghost"
            wrapperClassName="-mr-1.5"
          >
            <Icon icon={X} />
          </Button>
        )}
      </View>
    );
  };

  const renderOpenDocument = (previewItem: DocumentAttachmentItem) => {
    const item = previewItem.item;
    const DocumentIcon = getFileTypeIcon(item);

    const documentSource =
      previewItem.kind === 'file' ? getDocumentSource(item) : null;

    const canOpenDocument = previewItem.kind === 'file' && !!documentSource;

    const isDownloading =
      previewItem.kind === 'file' && downloadingDocumentIds.has(item.id);

    if (previewItem.kind !== 'file') {
      return (
        <View
          key={previewItem.id}
          className={cn(
            'flex-row w-full min-w-0 gap-2 items-center px-4 opacity-70',
            triggerClassName
          )}
        >
          <Icon
            className={cn('text-placeholder', triggerIconClassName)}
            icon={DocumentIcon}
          />
          <DocumentTextRow label={getDocumentName(item)} />
          {previewItem.item.status === 'uploading' && <Spinner size="xs" />}
        </View>
      );
    }

    return (
      <Button
        key={previewItem.id}
        disabled={downloadingDocumentIds.has(item.id) || !canOpenDocument}
        onPress={() => void handleOpenDocument(item)}
        variant="link"
        wrapperClassName="w-full overflow-visible rounded-lg"
        className={cn(
          'flex-row w-full min-w-0 gap-2 items-center px-4',
          triggerClassName
        )}
      >
        {isDownloading ? (
          <Spinner
            className={triggerIconClassName}
            color={placeholderColor}
            size="xs"
          />
        ) : (
          <Icon
            className={cn('text-placeholder', triggerIconClassName)}
            icon={DocumentIcon}
          />
        )}
        <DocumentTextRow
          label={getDocumentName(item)}
          trailing={
            <DocumentMetaText>{getDocumentSizeText(item)}</DocumentMetaText>
          }
        />
      </Button>
    );
  };

  if (!items.length) return null;

  return (
    <View className={cn('gap-2', className)}>
      {hideTrigger ? null : shouldOpenDocumentsInline ? (
        items.map(renderOpenDocument)
      ) : canDeleteSingleDocument && firstItem ? (
        <View
          className={cn(
            'flex-row w-full gap-2 items-center justify-between px-4',
            firstItem.kind === 'pending' && 'opacity-70',
            triggerClassName
          )}
        >
          {canRenameDocuments && firstItem.kind === 'file' ? (
            <Button
              className="flex-1 flex-row min-w-0 gap-2 items-center"
              onPress={() => handleOpenNameEditor(firstItem.item)}
              variant="link"
              wrapperClassName="flex-1 overflow-visible rounded-lg"
            >
              <View className="flex-1 flex-row min-w-0 gap-2 items-center">
                <Icon
                  className={cn('text-placeholder', triggerIconClassName)}
                  icon={firstDocumentIcon}
                />
                <DocumentTextRow
                  label={firstDocumentName}
                  trailing={
                    <DocumentMetaText>
                      {getDocumentSizeText(firstItem.item)}
                    </DocumentMetaText>
                  }
                />
              </View>
            </Button>
          ) : (
            <>
              <View className="flex-1 flex-row min-w-0 gap-2 items-center">
                <Icon
                  className={cn('text-placeholder', triggerIconClassName)}
                  icon={firstDocumentIcon}
                />
                <DocumentTextRow
                  label={firstDocumentName}
                  trailing={
                    <DocumentMetaText>
                      {getDocumentSizeText(firstItem.item)}
                    </DocumentMetaText>
                  }
                />
              </View>
            </>
          )}
          <View className="flex-row gap-2 items-center shrink-0">
            {firstItem.kind === 'file' ? (
              <Button
                accessibilityLabel={`Remove ${getDocumentName(firstItem.item)}`}
                disabled={actionsDisabled}
                onPress={() => handleDeleteDocument(firstItem.item.id)}
                size="icon-xs"
                variant="ghost"
                wrapperClassName="-mr-1.5"
              >
                <Icon icon={X} />
              </Button>
            ) : (
              <>
                {firstItem.item.status === 'uploading' && <Spinner size="xs" />}
                {!!onDeleteFile && (
                  <Button
                    accessibilityLabel={`Remove ${getDocumentName(firstItem.item)}`}
                    disabled={actionsDisabled}
                    onPress={() => handleDeleteDocument(firstItem.item.id)}
                    size="icon-xs"
                    variant="ghost"
                    wrapperClassName="-mr-1.5"
                  >
                    <Icon icon={X} />
                  </Button>
                )}
              </>
            )}
          </View>
        </View>
      ) : (
        <Button
          disabled={actionsDisabled}
          onPress={handleOpenSheet}
          variant="link"
          wrapperClassName="w-full overflow-visible rounded-lg"
          className={cn(
            'flex-row w-full gap-2 items-center px-4',
            triggerClassName
          )}
        >
          <Icon
            className={cn('text-placeholder', triggerIconClassName)}
            icon={items.length === 1 ? firstDocumentIcon : DocumentsIcon}
          />
          <DocumentTextRow
            label={firstDocumentName}
            trailing={
              moreDocumentsText ? (
                <DocumentMetaText>{moreDocumentsText}</DocumentMetaText>
              ) : (
                showSummarySize && (
                  <DocumentMetaText>{totalSizeText}</DocumentMetaText>
                )
              )
            }
          />
          {moreDocumentsText && hasUploadingPendingDocuments && (
            <Spinner size="xs" />
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
          <SheetListScrollView
            ref={scrollViewRef}
            contentContainerClassName="py-5"
          >
            {canSortDocuments ? (
              <Sortable.SortableGrid
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
          <SheetFooter className="flex" contentClassName="flex-row gap-4">
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
      {canRenameDocuments && (
        <Sheet
          className="md:max-w-sm"
          onDismiss={handleCloseNameEditor}
          open={!!editingDocument}
          portalName={nameEditorPortalName}
          topInset={64}
        >
          <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 md:p-8">
            <View>
              <Field
                autoFocus
                label="Name"
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
                {isRenaming ? <Spinner /> : <Text>Save</Text>}
              </Button>
            </View>
          </View>
        </Sheet>
      )}
    </View>
  );
};
