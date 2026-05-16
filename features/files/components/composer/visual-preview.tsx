import { PendingVideoPreview } from '@/features/files/components/composer/pending-video-preview';
import { PreviewImage } from '@/features/files/components/composer/preview-image';
import type * as fileComposer from '@/features/files/types/composer';
import { cn } from '@/lib/cn';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import * as Sortable from '@/ui/sortable';
import { Spinner } from '@/ui/spinner';
import { X } from 'phosphor-react-native';
import * as React from 'react';
import { Pressable, View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

const getItemOrderKey = (items: fileComposer.VisualPreviewItem[]) =>
  items.map((item) => item.id).join('\0');

const getVisualItemKey = (item: fileComposer.VisualPreviewItem) => item.id;

const areOrderKeysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

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
  onReorderVisualItems?: (items: fileComposer.VisualPreviewItem[]) => void;
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
    onReorderVisualItems(displayedVisualItems);
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
      onReorderVisualItems?.(orderedItems);
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

    return (
      <View key={item.id} className="relative size-16">
        {item.pending ? (
          <Pressable
            className="flex-1 overflow-hidden border-continuous rounded-lg bg-border"
            disabled={!canOpenItem}
            onPress={() => {
              if (canOpenItem) onOpenVisual(item.id);
            }}
          >
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
                  fill
                  uri={item.localUri ?? item.uri}
                  wrapperClassName="bg-card"
                />
              )}
              {item.status === 'uploading' && (
                <View className="absolute inset-0 z-[4] pointer-events-none items-center justify-center">
                  <Spinner size="xs" />
                </View>
              )}
            </View>
          </Pressable>
        ) : (
          <Pressable
            className="flex-1 overflow-hidden border-continuous rounded-lg bg-border"
            disabled={!canOpenItem}
            onPress={() => {
              if (canOpenItem) onOpenVisual(item.id);
            }}
          >
            <PreviewImage item={item} onRemoteReady={onRemoteReady} />
          </Pressable>
        )}
        <View className="absolute inset-x-0 top-0 z-10 h-8 rounded-t-lg bg-gradient-to-b from-background/60 to-background/0 pointer-events-none" />
        {canDragItem && (
          <Sortable.SortableDragHandle
            className="absolute left-0 top-0 z-20 size-6"
            iconClassName="text-foreground"
            iconSize={16}
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
      contentContainerClassName="p-3"
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
        <View>
          <Sortable.SortableGrid
            autoScrollDirection="horizontal"
            columnGap={12}
            data={displayedVisualItems}
            keyExtractor={getVisualItemKey}
            onDragEnd={handleDragEnd}
            renderItem={({ item }) => renderItem(item)}
            rowHeight={64}
            rows={1}
            scrollableRef={scrollViewRef}
          />
        </View>
      ) : (
        <View className="flex-row gap-3">
          {displayedVisualItems.map(renderItem)}
        </View>
      )}
    </Animated.ScrollView>
  );
};
