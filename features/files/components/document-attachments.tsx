import * as attachmentItems from '@/features/files/lib/attachment-items';
import { useDocumentDownloads } from '@/features/files/hooks/use-document-downloads';
import type * as fileComposer from '@/features/files/types/composer';
import type { FileItem } from '@/features/files/types/file';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { getReorderedItems, type ReorderedItem } from '@/lib/reorder-items';
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
import * as documentAttachmentPrimitives from '@/features/files/components/document-attachment-primitives';

type DocumentAttachmentItem = attachmentItems.AttachmentPreviewItem<
  FileItem,
  fileComposer.PendingDocumentUpload
>;

const NO_PENDING_DOCUMENTS: fileComposer.PendingDocumentUpload[] = [];

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
  triggerActionClassName,
  triggerClassName,
  triggerIconClassName,
}: {
  actionsDisabled?: boolean;
  className?: string;
  documents: FileItem[];
  hideTrigger?: boolean;
  onDeleteFile?: (fileId: string) => void;
  onRenameFile?: (fileId: string, name: string) => Promise<void>;
  onReorderFiles?: (files: ReorderedItem[]) => void;
  onSheetOpenChange?: (open: boolean) => void;
  pendingDocuments?: fileComposer.PendingDocumentUpload[];
  portalName?: string;
  sheetOpen?: boolean;
  triggerActionClassName?: string;
  triggerClassName?: string;
  triggerIconClassName?: string;
}) => {
  const colorScheme = useColorScheme();
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const [localSheetOpen, setLocalSheetOpen] = React.useState(false);

  const [editingDocumentId, setEditingDocumentId] = React.useState<
    string | null
  >(null);

  const [editingName, setEditingName] = React.useState('');
  const [isRenaming, setIsRenaming] = React.useState(false);
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

  const totalSizeText = React.useMemo(
    () => documentAttachmentPrimitives.getTotalSizeText(items),
    [items]
  );

  const firstItem = items[0];
  const { downloadingDocumentIds, openDocument } = useDocumentDownloads(items);

  const hasUploadingPendingDocuments = pendingDocuments.some(
    (item) => item.status === 'uploading'
  );

  const canDeleteSingleDocument = !!onDeleteFile && items.length === 1;
  const shouldOpenDocumentsInline = !onDeleteFile;
  const canRenameDocuments = !!onRenameFile && !actionsDisabled;

  const canRenamePreviewItem = React.useCallback(
    (item: DocumentAttachmentItem) =>
      canRenameDocuments &&
      (item.kind === 'file' || item.item.status !== 'uploading'),
    [canRenameDocuments]
  );

  const editingDocument = React.useMemo(
    () => items.find((item) => item.id === editingDocumentId) ?? null,
    [editingDocumentId, items]
  );

  const canSortDocumentSet = !!onReorderFiles && items.length > 1;
  const canSortDocuments = canSortDocumentSet && !actionsDisabled;

  const shouldRenderSheet =
    !shouldOpenDocumentsInline &&
    (!canDeleteSingleDocument || hideTrigger || isSheetOpen);

  const showSummarySize = items.length === 1;

  const firstDocumentName = firstItem
    ? documentAttachmentPrimitives.getDocumentName(firstItem.item)
    : null;

  const firstDocumentIcon = firstItem
    ? documentAttachmentPrimitives.getDocumentIcon(firstItem.item)
    : DocumentsIcon;

  const trimmedEditingName = editingName.trim();

  const canRenameDocument =
    !!editingDocument &&
    canRenamePreviewItem(editingDocument) &&
    !!trimmedEditingName;

  const moreDocumentsText =
    items.length > 1 ? `+${items.length - 1} more` : null;

  const handleOpenSheet = React.useCallback(() => {
    setIsSheetOpen(true);
  }, [setIsSheetOpen]);

  const handleOpenNameEditor = React.useCallback(
    (item: DocumentAttachmentItem) => {
      if (actionsDisabled) return;
      if (!canRenamePreviewItem(item)) return;
      setEditingDocumentId(item.id);
      setEditingName(documentAttachmentPrimitives.getDocumentName(item.item));
    },
    [actionsDisabled, canRenamePreviewItem]
  );

  const handleCloseNameEditor = React.useCallback(() => {
    if (isRenaming) return;
    setEditingDocumentId(null);
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
      onReorderFiles?.(getReorderedItems(params.data));
    },
    [onReorderFiles]
  );

  const handleRenameDocument = React.useCallback(async () => {
    if (!canRenameDocument || !editingDocumentId || !onRenameFile) return;
    setIsRenaming(true);

    try {
      await onRenameFile(editingDocumentId, trimmedEditingName);
      setEditingDocumentId(null);
      setEditingName('');
    } catch {
      // noop
    } finally {
      setIsRenaming(false);
    }
  }, [canRenameDocument, editingDocumentId, onRenameFile, trimmedEditingName]);

  React.useEffect(() => {
    if (!editingDocumentId) return;
    if (editingDocument) return;
    setEditingDocumentId(null);
    setEditingName('');
  }, [editingDocument, editingDocumentId]);

  const renderSheetItem = (previewItem: DocumentAttachmentItem) => {
    const item = previewItem.item;
    const DocumentIcon = documentAttachmentPrimitives.getDocumentIcon(item);

    const documentSource =
      previewItem.kind === 'file'
        ? documentAttachmentPrimitives.getDocumentSource(item)
        : null;

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
        <documentAttachmentPrimitives.DocumentTextRow
          label={documentAttachmentPrimitives.getDocumentName(item)}
          trailing={
            <documentAttachmentPrimitives.DocumentMetaText>
              {documentAttachmentPrimitives.getDocumentSizeText(item)}
            </documentAttachmentPrimitives.DocumentMetaText>
          }
        />
      </View>
    );

    const dragHandle = canSortDocumentSet ? (
      <Sortable.SortableSheetDragHandle
        className="-ml-1.5 mr-1"
        disabled={!canSortDocuments}
      />
    ) : null;

    const renameableDocument = canRenamePreviewItem(previewItem);

    if (previewItem.kind === 'file') {
      if (onDeleteFile) {
        return (
          <View key={previewItem.id} className="flex-row min-w-0 items-center">
            {dragHandle}
            {renameableDocument ? (
              <Button
                className="flex-1 flex-row min-w-0 justify-start"
                disabled={actionsDisabled}
                onPress={() => handleOpenNameEditor(previewItem)}
                variant="link"
                wrapperClassName="flex-1 overflow-visible rounded-lg"
              >
                {documentDetails}
              </Button>
            ) : (
              documentDetails
            )}
            <Button
              accessibilityLabel={`Remove ${documentAttachmentPrimitives.getDocumentName(item)}`}
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
            void openDocument(previewItem.item);
          }}
        >
          {documentDetails}
        </Button>
      );
    }

    return (
      <View key={previewItem.id} className="flex-row min-w-0 items-center">
        {dragHandle}
        {renameableDocument ? (
          <Button
            className="flex-1 flex-row min-w-0 justify-start"
            disabled={actionsDisabled}
            onPress={() => handleOpenNameEditor(previewItem)}
            variant="link"
            wrapperClassName="flex-1 overflow-visible rounded-lg"
          >
            {documentDetails}
          </Button>
        ) : (
          documentDetails
        )}
        {isUploading && <Spinner size="xs" />}
        {!!onDeleteFile && (
          <Button
            accessibilityLabel={`Remove ${documentAttachmentPrimitives.getDocumentName(item)}`}
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
    const DocumentIcon = documentAttachmentPrimitives.getDocumentIcon(item);

    const documentSource =
      previewItem.kind === 'file'
        ? documentAttachmentPrimitives.getDocumentSource(item)
        : null;

    const canOpenDocument = previewItem.kind === 'file' && !!documentSource;

    const isDownloading =
      previewItem.kind === 'file' && downloadingDocumentIds.has(item.id);

    if (previewItem.kind !== 'file') {
      return (
        <View
          key={previewItem.id}
          className={cn(
            'flex-row w-full min-w-0 gap-2 items-center px-4',
            triggerClassName
          )}
        >
          <Icon
            className={cn('text-placeholder', triggerIconClassName)}
            icon={DocumentIcon}
          />
          <documentAttachmentPrimitives.DocumentTextRow
            label={documentAttachmentPrimitives.getDocumentName(item)}
          />
          {previewItem.item.status === 'uploading' && <Spinner size="xs" />}
        </View>
      );
    }

    return (
      <Button
        key={previewItem.id}
        disabled={downloadingDocumentIds.has(item.id) || !canOpenDocument}
        onPress={() => void openDocument(item)}
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
        <documentAttachmentPrimitives.DocumentTextRow
          label={documentAttachmentPrimitives.getDocumentName(item)}
          trailing={
            <documentAttachmentPrimitives.DocumentMetaText>
              {documentAttachmentPrimitives.getDocumentSizeText(item)}
            </documentAttachmentPrimitives.DocumentMetaText>
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
            triggerClassName
          )}
        >
          {canRenamePreviewItem(firstItem) ? (
            <Button
              className="flex-1 flex-row min-w-0 gap-2 items-center"
              onPress={() => handleOpenNameEditor(firstItem)}
              variant="link"
              wrapperClassName="flex-1 overflow-visible rounded-lg"
            >
              <View className="flex-1 flex-row min-w-0 gap-2 items-center">
                <Icon
                  className={cn('text-placeholder', triggerIconClassName)}
                  icon={firstDocumentIcon}
                />
                <documentAttachmentPrimitives.DocumentTextRow
                  label={firstDocumentName}
                  trailing={
                    <documentAttachmentPrimitives.DocumentMetaText>
                      {documentAttachmentPrimitives.getDocumentSizeText(
                        firstItem.item
                      )}
                    </documentAttachmentPrimitives.DocumentMetaText>
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
                <documentAttachmentPrimitives.DocumentTextRow
                  label={firstDocumentName}
                  trailing={
                    <documentAttachmentPrimitives.DocumentMetaText>
                      {documentAttachmentPrimitives.getDocumentSizeText(
                        firstItem.item
                      )}
                    </documentAttachmentPrimitives.DocumentMetaText>
                  }
                />
              </View>
            </>
          )}
          <View className="flex-row gap-2 items-center shrink-0">
            {firstItem.kind === 'file' ? (
              <Button
                accessibilityLabel={`Remove ${documentAttachmentPrimitives.getDocumentName(firstItem.item)}`}
                disabled={actionsDisabled}
                onPress={() => handleDeleteDocument(firstItem.item.id)}
                size="icon-xs"
                variant="ghost"
                wrapperClassName={triggerActionClassName ?? '-mr-1.5'}
              >
                <Icon icon={X} />
              </Button>
            ) : (
              <>
                {firstItem.item.status === 'uploading' && <Spinner size="xs" />}
                {!!onDeleteFile && (
                  <Button
                    accessibilityLabel={`Remove ${documentAttachmentPrimitives.getDocumentName(firstItem.item)}`}
                    disabled={actionsDisabled}
                    onPress={() => handleDeleteDocument(firstItem.item.id)}
                    size="icon-xs"
                    variant="ghost"
                    wrapperClassName={triggerActionClassName ?? '-mr-1.5'}
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
          <documentAttachmentPrimitives.DocumentTextRow
            label={firstDocumentName}
            trailing={
              moreDocumentsText ? (
                <documentAttachmentPrimitives.DocumentMetaText>
                  {moreDocumentsText}
                </documentAttachmentPrimitives.DocumentMetaText>
              ) : (
                showSummarySize && (
                  <documentAttachmentPrimitives.DocumentMetaText>
                    {totalSizeText}
                  </documentAttachmentPrimitives.DocumentMetaText>
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
          open={!!editingDocumentId}
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
