import * as linkUrl from '@/features/records/lib/link-url';
import * as sheetPayloads from '@/features/records/lib/sheet-payloads';
import type { Link } from '@/features/records/types/link';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { alert as showAlert } from '@/lib/alert';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import * as Sortable from '@/ui/sortable';
import { Text } from '@/ui/text';
import { ArrowSquareOut, LinkSimple, X } from 'phosphor-react-native';
import * as React from 'react';
import { Linking, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

const byOrder = (a: Link, b: Link) => (a.order ?? 0) - (b.order ?? 0);
const getLinkLabel = (item: Link) => item.label?.trim() || 'Link';
const linkLabelClassName = 'flex-1 flex-row min-w-0 gap-2 items-center';

const linkUrlClassName =
  'max-w-[45%] min-w-0 flex-row items-center justify-end shrink-0';

const LinkUrlText = ({
  className,
  url,
}: {
  className?: string;
  url: string;
}) => (
  <Text
    className={cn('min-w-0 text-placeholder text-xs shrink', className)}
    ellipsizeMode="head"
    numberOfLines={1}
  >
    {linkUrl.getLinkUrlDisplayText(url)}
  </Text>
);

export const LinkAttachments = ({
  className,
  hideTrigger,
  links,
  onDeleteLink,
  onReorderLinks,
  onSheetOpenChange,
  parent,
  portalName,
  sheetOpen,
  triggerClassName,
  triggerIconClassName,
}: {
  className?: string;
  hideTrigger?: boolean;
  links: Link[];
  onDeleteLink?: (linkId: string) => void;
  onReorderLinks?: (links: { id: string }[]) => void;
  onSheetOpenChange?: (open: boolean) => void;
  parent?: sheetPayloads.RecordSheetParent;
  portalName?: string;
  sheetOpen?: boolean;
  triggerClassName?: string;
  triggerIconClassName?: string;
}) => {
  const sheetManager = useSheetManager();
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const [localSheetOpen, setLocalSheetOpen] = React.useState(false);
  const sheetId = React.useId();
  const isSheetOpen = sheetOpen ?? localSheetOpen;

  const sheetPortalName = React.useMemo(
    () => portalName ?? `link-attachments-${sheetId.replace(/:/g, '')}`,
    [portalName, sheetId]
  );

  const setIsSheetOpen = React.useCallback(
    (open: boolean) => {
      onSheetOpenChange?.(open);
      if (sheetOpen === undefined) setLocalSheetOpen(open);
    },
    [onSheetOpenChange, sheetOpen]
  );

  const items = React.useMemo(() => [...links].sort(byOrder), [links]);
  const firstItem = items[0];
  const canDeleteSingleLink = !!onDeleteLink && items.length === 1;
  const canSortLinks = !!onReorderLinks && items.length > 1;
  const shouldOpenLinksInline = !onDeleteLink;

  const shouldRenderSheet =
    !shouldOpenLinksInline &&
    (!canDeleteSingleLink || hideTrigger || isSheetOpen);

  const moreLinksText = items.length > 1 ? `+${items.length - 1} more` : null;

  const handleOpenLink = React.useCallback(async (item: Link) => {
    const url = linkUrl.normalizeLinkUrl(item.url);

    if (!url) {
      showAlert({
        message: 'Could not open this link.',
        title: 'Link unavailable',
      });

      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      showAlert({
        message: 'Could not open this link.',
        title: 'Link unavailable',
      });
    }
  }, []);

  const handleOpenSheet = React.useCallback(() => {
    if (parent) {
      sheetPayloads.openRecordLinkAttachmentsSheet(sheetManager, { parent });
      return;
    }

    setIsSheetOpen(true);
  }, [parent, setIsSheetOpen, sheetManager]);

  const handleDeleteLink = React.useCallback(
    (linkId: string) => {
      onDeleteLink?.(linkId);
      if (items.length <= 1) setIsSheetOpen(false);
    },
    [items.length, onDeleteLink]
  );

  const handleEditLink = React.useCallback(
    (linkId: string) => {
      sheetPayloads.openRecordLinkEditorSheet(sheetManager, {
        linkId,
        mode: 'edit',
      });
    },
    [sheetManager]
  );

  const handleDragEnd = React.useCallback(
    (params: Sortable.SortableGridDragEndParams<Link>) => {
      if (params.fromIndex === params.toIndex) return;
      onReorderLinks?.(params.data);
    },
    [onReorderLinks]
  );

  if (!items.length || !firstItem) return null;

  const renderOpenLink = (item: Link) => (
    <Button
      key={item.id}
      onPress={() => void handleOpenLink(item)}
      variant="link"
      wrapperClassName="w-full overflow-visible rounded-lg"
      className={cn(
        'flex-row w-full min-w-0 gap-4 justify-between px-4',
        triggerClassName
      )}
    >
      <View className={linkLabelClassName}>
        <Icon
          className={cn('text-placeholder', triggerIconClassName)}
          icon={ArrowSquareOut}
        />
        <Text
          className="font-normal text-muted-foreground text-sm shrink"
          numberOfLines={1}
        >
          {getLinkLabel(item)}
        </Text>
      </View>
      <View className={linkUrlClassName}>
        <LinkUrlText className="font-normal" url={item.url} />
      </View>
    </Button>
  );

  const firstLinkDetails = (
    <View className={linkLabelClassName}>
      <Icon
        className={cn('text-placeholder', triggerIconClassName)}
        icon={LinkSimple}
      />
      <Text
        className="font-normal text-muted-foreground text-sm shrink"
        numberOfLines={1}
      >
        {getLinkLabel(firstItem)}
      </Text>
    </View>
  );

  const renderSheetItem = (item: Link) => {
    const linkDetails = (
      <View className="flex-1 flex-row min-w-0 gap-4 items-center justify-between">
        <View className={linkLabelClassName}>
          <Icon className="text-placeholder" icon={LinkSimple} />
          <Text
            className="text-muted-foreground text-sm shrink"
            numberOfLines={1}
          >
            {getLinkLabel(item)}
          </Text>
        </View>
        <View className={linkUrlClassName}>
          <LinkUrlText url={item.url} />
        </View>
      </View>
    );

    return (
      <View key={item.id} className="flex-row min-w-0 gap-3 items-center">
        {canSortLinks && (
          <Sortable.SortableSheetDragHandle className="-ml-1.5" />
        )}
        <Button
          className="flex-1 flex-row min-w-0 justify-start"
          onPress={() => handleEditLink(item.id)}
          variant="link"
          wrapperClassName="flex-1 overflow-visible rounded-lg"
        >
          {linkDetails}
        </Button>
        <Button
          accessibilityLabel={`Remove ${getLinkLabel(item)}`}
          onPress={() => handleDeleteLink(item.id)}
          size="icon-sm"
          variant="ghost"
          wrapperClassName="-mr-1.5"
        >
          <Icon icon={X} />
        </Button>
      </View>
    );
  };

  return (
    <View className={cn('min-w-0 gap-2', className)}>
      {hideTrigger ? null : shouldOpenLinksInline ? (
        items.map(renderOpenLink)
      ) : canDeleteSingleLink ? (
        <View
          className={cn(
            'flex-row w-full min-w-0 gap-3 justify-between px-4',
            triggerClassName
          )}
        >
          <Button
            className="flex-1 flex-row min-w-0 gap-4 justify-between"
            onPress={() => handleEditLink(firstItem.id)}
            variant="link"
            wrapperClassName="flex-1 overflow-visible rounded-lg"
          >
            {firstLinkDetails}
            <View className={linkUrlClassName}>
              <LinkUrlText className="font-normal" url={firstItem.url} />
            </View>
          </Button>
          <View className="flex-row gap-2 items-center shrink-0">
            <Button
              accessibilityLabel={`Remove ${getLinkLabel(firstItem)}`}
              onPress={() => handleDeleteLink(firstItem.id)}
              size="icon-sm"
              variant="ghost"
              wrapperClassName="-mr-1.5"
            >
              <Icon icon={X} />
            </Button>
          </View>
        </View>
      ) : (
        <Button
          onPress={handleOpenSheet}
          variant="link"
          wrapperClassName="w-full overflow-visible rounded-lg"
          className={cn(
            'flex-row w-full min-w-0 gap-4 justify-between px-4',
            triggerClassName
          )}
        >
          {firstLinkDetails}
          <View className="shrink-0">
            <Text
              className="font-normal text-placeholder text-xs"
              numberOfLines={1}
            >
              {moreLinksText}
            </Text>
          </View>
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
            {canSortLinks ? (
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
    </View>
  );
};
