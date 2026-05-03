import { PendingVideoPreview } from '@/features/files/components/composer/pending-video-preview';
import { PreviewImage } from '@/features/files/components/composer/preview-image';
import type * as fileComposer from '@/features/files/types/composer';
import { cn } from '@/lib/cn';
import { UI } from '@/theme/ui';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import * as Sortable from '@/ui/sortable';
import { Spinner } from '@/ui/spinner';
import { X } from 'phosphor-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

const getItemOrderKey = (items: fileComposer.VisualPreviewItem[]) =>
  items.map((item) => item.id).join('\0');

const getVisualItemKey = (item: fileComposer.VisualPreviewItem) => item.id;

const areOrderKeysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export const VisualPreview = ({
  autoPlayPendingVideoId,
  onDeleteFile,
  onOpenVisual,
  onReorderVisualItems,
  onRemoteReady,
  showBottomBorder,
  visualItems,
}: {
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

  const canSort = !!onReorderVisualItems && displayedVisualItems.length > 1;

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
    if (displayedVisualItems.some((item) => item.pending)) return;
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

      if (orderedItems.some((item) => item.pending)) {
        lastPersistedOrderKeyRef.current = null;
        return;
      }

      lastPersistedOrderKeyRef.current = orderKey;
      onReorderVisualItems?.(orderedItems);
    },
    [onReorderVisualItems]
  );

  if (!displayedVisualItems.length) return null;

  const renderItem = (item: fileComposer.VisualPreviewItem) => {
    const canDragItem = canSort && !item.pending;

    return (
      <View key={item.id} className="relative size-16">
        {item.pending ? (
          <View className="flex-1 overflow-hidden border-continuous rounded-lg bg-border cursor-default">
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
              <View className="absolute inset-0 z-[4] pointer-events-none items-center justify-center">
                <Spinner color={UI.light.contrastForeground} size="xs" />
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            className="flex-1 overflow-hidden border-continuous rounded-lg bg-border"
            onPress={() => onOpenVisual(item.id)}
          >
            <PreviewImage item={item} onRemoteReady={onRemoteReady} />
          </Pressable>
        )}
        {(canDragItem || !item.pending) && (
          <View className="absolute inset-x-0 top-0 z-10 h-8 rounded-t-lg bg-gradient-to-b from-contrast-background/60 to-contrast-background/0 pointer-events-none" />
        )}
        {canDragItem && (
          <Sortable.SortableDragHandle
            className="absolute left-0 top-0 z-20 size-6"
            iconClassName="text-contrast-foreground"
            iconSize={16}
          />
        )}
        {!item.pending && (
          <Pressable
            className="absolute right-0 top-0 z-20 size-6 items-center justify-center"
            onPress={() => onDeleteFile(item.id)}
          >
            <Icon className="text-contrast-foreground" icon={X} size={16} />
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      contentContainerClassName="py-4"
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      testID="scroll-lock-allow"
      className={cn(
        '-my-4 grow-0 shrink-0',
        showBottomBorder && 'border-border-secondary border-b'
      )}
    >
      {canSort ? (
        <View className="px-4">
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
        <View className="flex-row px-4 gap-3">
          {displayedVisualItems.map(renderItem)}
        </View>
      )}
    </Animated.ScrollView>
  );
};
