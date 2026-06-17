import { PendingVideoPreview } from '@/features/files/components/composer/pending-video-preview';
import { PreviewImage } from '@/features/files/components/composer/preview-image';
import { UploadProgressOverlay } from '@/features/files/components/upload-progress-overlay';
import * as visualMedia from '@/features/files/lib/visual-media';
import type * as fileComposer from '@/features/files/types/composer';
import { cn } from '@/lib/cn';
import { getReorderedItems, type ReorderedItem } from '@/lib/reorder-items';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import * as Sortable from '@/ui/sortable';
import { X } from 'phosphor-react-native';
import * as React from 'react';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

import {
  Platform,
  Pressable,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';

const getItemOrderKey = (items: fileComposer.VisualPreviewItem[]) =>
  items.map((item) => item.id).join('\0');

const getVisualItemKey = (item: fileComposer.VisualPreviewItem) => item.id;

const areOrderKeysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

const webNoSelectStyle =
  Platform.OS === 'web' ? ({ userSelect: 'none' } as ViewStyle) : undefined;

export const VisualPreview = ({
  actionsDisabled,
  autoPlayPendingVideoId,
  onDeleteFile,
  onOpenVisual,
  onReorderVisualItems,
  onRemoteReady,
  showBottomBorder,
  visualItems,
}: {
  actionsDisabled?: boolean;
  autoPlayPendingVideoId?: string;
  onDeleteFile: (fileId: string) => void;
  onOpenVisual: (fileId: string) => void;
  onReorderVisualItems?: (items: ReorderedItem[]) => void;
  onRemoteReady: (fileId: string) => void;
  showBottomBorder?: boolean;
  visualItems: fileComposer.VisualPreviewItem[];
}) => {
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();

  const [localOrderIds, setLocalOrderIds] = React.useState<string[] | null>(
    null
  );

  const lastPersistedOrderKeyRef = React.useRef<string | null>(null);

  const displayedVisualItems = React.useMemo(() => {
    if (!localOrderIds) return visualItems;
    const itemById = new Map(visualItems.map((item) => [item.id, item]));

    const orderedItems = localOrderIds.flatMap((id) => {
      const item = itemById.get(id);
      return item ? [item] : [];
    });

    const orderedIds = new Set(orderedItems.map((item) => item.id));

    return [
      ...orderedItems,
      ...visualItems.filter((item) => !orderedIds.has(item.id)),
    ];
  }, [localOrderIds, visualItems]);

  const canSort =
    !!onReorderVisualItems &&
    !actionsDisabled &&
    displayedVisualItems.length > 1;

  React.useEffect(() => {
    setLocalOrderIds((current) => {
      if (!current) return current;
      const visualIds = visualItems.map((item) => item.id);
      const visualIdSet = new Set(visualIds);

      const next = [
        ...current.filter((id) => visualIdSet.has(id)),
        ...visualIds.filter((id) => !current.includes(id)),
      ];

      if (
        visualItems.every((item) => !item.pending) &&
        areOrderKeysEqual(next, visualIds)
      ) {
        return null;
      }

      return areOrderKeysEqual(current, next) ? current : next;
    });
  }, [visualItems]);

  React.useEffect(() => {
    if (!localOrderIds || !onReorderVisualItems) return;
    const orderKey = getItemOrderKey(displayedVisualItems);
    if (lastPersistedOrderKeyRef.current === orderKey) return;
    lastPersistedOrderKeyRef.current = orderKey;
    onReorderVisualItems(getReorderedItems(displayedVisualItems));
  }, [displayedVisualItems, localOrderIds, onReorderVisualItems]);

  const handleDragEnd = React.useCallback(
    (
      params: Sortable.SortableGridDragEndParams<fileComposer.VisualPreviewItem>
    ) => {
      if (params.fromIndex === params.toIndex) return;
      const orderedItems = params.data;
      const orderKey = getItemOrderKey(orderedItems);
      setLocalOrderIds(orderedItems.map((item) => item.id));
      lastPersistedOrderKeyRef.current = orderKey;
      onReorderVisualItems?.(getReorderedItems(orderedItems));
    },
    [onReorderVisualItems]
  );

  if (!displayedVisualItems.length) return null;

  const renderItem = (item: fileComposer.VisualPreviewItem) => {
    const canDragItem = canSort;
    const sourceUri = item.localUri ?? item.uri;
    const canOpenItem = !!sourceUri;

    const handleDeletePress = (event: GestureResponderEvent) => {
      event.stopPropagation();
      onDeleteFile(item.id);
    };

    const handleOpenItem = () => {
      if (canOpenItem) onOpenVisual(item.id);
    };

    const thumbnailContent = item.pending ? (
      <View className="flex-1 bg-card">
        {item.type === 'video' ? (
          <PendingVideoPreview
            autoPlay={item.id === autoPlayPendingVideoId}
            height={item.height}
            uri={item.localUri ?? item.uri}
            width={item.width}
          />
        ) : (
          <Image
            contentFit="cover"
            draggable={false}
            fill
            uri={item.localUri ?? item.uri}
            wrapperClassName="bg-card"
          />
        )}
        <UploadProgressOverlay
          fileId={item.id}
          isVideo={item.type === 'video'}
          spinnerSize="xs"
          status={item.status}
        />
      </View>
    ) : item.type === 'video' &&
      visualMedia.isProcessing(item) &&
      visualMedia.isLocalPreviewableUri(item.localUri ?? item.uri) ? (
      <View className="flex-1 bg-card">
        <PendingVideoPreview
          height={item.height}
          uri={item.localUri ?? item.uri}
          width={item.width}
        />
        <UploadProgressOverlay
          fileId={item.id}
          isProcessing
          isVideo
          spinnerSize="xs"
        />
      </View>
    ) : (
      <View className="flex-1">
        <PreviewImage item={item} onRemoteReady={onRemoteReady} />
        {item.type === 'video' && (
          <UploadProgressOverlay
            fileId={item.id}
            isProcessing={visualMedia.isProcessing(item)}
            isVideo
            spinnerSize="xs"
          />
        )}
      </View>
    );

    const thumbnail = canDragItem ? (
      <Sortable.SortableDragSurface
        onPress={canOpenItem ? handleOpenItem : undefined}
        style={webNoSelectStyle}
        className={cn(
          'flex-1 overflow-hidden border-continuous rounded-lg bg-border select-none web:outline-hidden',
          'cursor-grab'
        )}
      >
        {thumbnailContent}
      </Sortable.SortableDragSurface>
    ) : (
      <Pressable
        className="flex-1 overflow-hidden border-continuous rounded-lg bg-border select-none web:outline-hidden"
        disabled={!canOpenItem}
        onPress={handleOpenItem}
        style={webNoSelectStyle}
      >
        {thumbnailContent}
      </Pressable>
    );

    return (
      <View
        key={item.id}
        className="relative size-16 select-none web:outline-hidden"
        style={webNoSelectStyle}
      >
        {thumbnail}
        <View className="absolute inset-x-0 top-0 z-10 h-8 rounded-t-lg bg-gradient-to-b from-background/60 to-background/0 pointer-events-none" />
        {canDragItem && (
          <Sortable.SortableDragHandle
            className="absolute left-0 top-0 z-20 size-6 pointer-events-none"
            iconClassName="text-foreground"
            iconSize={16}
            interactive={false}
          />
        )}
        <Pressable
          disabled={actionsDisabled}
          onPress={handleDeletePress}
          className={cn(
            'absolute right-0 top-0 z-20 size-6 items-center justify-center',
            actionsDisabled && 'opacity-50'
          )}
        >
          <Icon className="text-foreground" icon={X} size={16} />
        </Pressable>
      </View>
    );
  };

  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      contentContainerClassName="p-3 select-none"
      contentContainerStyle={webNoSelectStyle}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      testID="scroll-lock-allow"
      className={cn(
        'grow-0 shrink-0',
        showBottomBorder && 'border-border-secondary border-b'
      )}
    >
      {canSort ? (
        <View className="select-none" style={webNoSelectStyle}>
          <Sortable.SortableGrid
            activeItemScale={1}
            autoScrollDirection="horizontal"
            columnGap={12}
            data={displayedVisualItems}
            inactiveItemOpacity={1}
            keyExtractor={getVisualItemKey}
            onDragEnd={handleDragEnd}
            renderItem={({ item }) => renderItem(item)}
            rowHeight={64}
            rows={1}
            scrollableRef={scrollViewRef}
          />
        </View>
      ) : (
        <View className="flex-row select-none gap-3" style={webNoSelectStyle}>
          {displayedVisualItems.map(renderItem)}
        </View>
      )}
    </Animated.ScrollView>
  );
};
