import * as linkUrl from '@/features/records/lib/link-url';
import { useShowOfflineUi } from '@/features/offline/offline-ui-state';
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
import { LinkSimple, X } from 'phosphor-react-native';
import * as React from 'react';
import { Linking, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

const byOrder = (a: Link, b: Link) => (a.order ?? 0) - (b.order ?? 0);
const getLinkLabel = (item: Link) => item.label?.trim() || 'Link';
type LinkAttachmentItem = Link & { localStatus?: 'error' | 'pending' };

const LinkUrlText = ({
  className,
  url,
}: {
  className?: string;
  url: string;
}) => (
  <Text
    ellipsizeMode="head"
    numberOfLines={1}
    className={cn(
      'min-w-0 font-normal text-placeholder text-xs shrink',
      className
    )}
  >
    {linkUrl.getLinkUrlDisplayText(url)}
  </Text>
);

const LinkAttachmentDetails = ({
  iconClassName,
  label,
  trailing,
}: {
  iconClassName?: string;
  label: React.ReactNode;
  trailing?: React.ReactNode;
}) => (
  <>
    <Icon className={cn('text-placeholder', iconClassName)} icon={LinkSimple} />
    <View className="flex-1 flex-row min-w-0 gap-4 items-baseline justify-between">
      <Text
        className="font-normal text-muted-foreground text-sm shrink"
        numberOfLines={1}
      >
        {label}
      </Text>
      {trailing}
    </View>
  </>
);

export const LinkAttachments = ({
  actionsDisabled,
  className,
  hideTrigger,
  links,
  onDeleteLink,
  onReorderLinks,
  onSheetOpenChange,
  parent,
  portalName,
  sheetLoading,
  sheetOpen,
  triggerClassName,
  triggerIconClassName,
}: {
  actionsDisabled?: boolean;
  className?: string;
  hideTrigger?: boolean;
  links: LinkAttachmentItem[];
  onDeleteLink?: (linkId: string) => void;
  onReorderLinks?: (links: { id: string }[]) => void;
  onSheetOpenChange?: (open: boolean) => void;
  parent?: sheetPayloads.RecordSheetParent;
  portalName?: string;
  sheetLoading?: boolean;
  sheetOpen?: boolean;
  triggerClassName?: string;
  triggerIconClassName?: string;
}) => {
  const showOfflineUi = useShowOfflineUi();
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
  const canShowNetworkActions = !showOfflineUi;
  const canSortLinkSet = !!onReorderLinks && items.length > 1;
  const canSortLinks = canSortLinkSet && canShowNetworkActions;
  const shouldOpenLinksInline = !onDeleteLink;

  const canMutateLink = React.useCallback(
    (item: LinkAttachmentItem) =>
      !!onDeleteLink &&
      !actionsDisabled &&
      (canShowNetworkActions || !!item.localStatus),
    [actionsDisabled, canShowNetworkActions, onDeleteLink]
  );

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
    [items.length, onDeleteLink, setIsSheetOpen]
  );

  const handleEditLink = React.useCallback(
    (item: LinkAttachmentItem) => {
      if (!canMutateLink(item)) return;

      sheetPayloads.openRecordLinkEditorSheet(sheetManager, {
        linkId: item.id,
        mode: 'edit',
      });
    },
    [canMutateLink, sheetManager]
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
        'flex-row w-full min-w-0 gap-2 items-center px-4',
        triggerClassName
      )}
    >
      <LinkAttachmentDetails
        iconClassName={triggerIconClassName}
        label={getLinkLabel(item)}
        trailing={
          <LinkUrlText className="max-w-[45%] font-normal" url={item.url} />
        }
      />
    </Button>
  );

  const renderSheetItem = (item: LinkAttachmentItem) => {
    const isMutateDisabled = !canMutateLink(item);

    const linkDetails = (
      <View className="flex-1 flex-row min-w-0 gap-2 items-center">
        <LinkAttachmentDetails
          label={getLinkLabel(item)}
          trailing={<LinkUrlText className="max-w-[45%]" url={item.url} />}
        />
      </View>
    );

    return (
      <View key={item.id} className="flex-row min-w-0 items-center">
        {canSortLinkSet && (
          <Sortable.SortableSheetDragHandle
            className="-ml-1.5 mr-1"
            disabled={!canSortLinks}
          />
        )}
        <Button
          className="flex-1 flex-row min-w-0 justify-start"
          disabled={isMutateDisabled}
          onPress={() => handleEditLink(item)}
          variant="link"
          wrapperClassName="flex-1 overflow-visible rounded-lg"
        >
          {linkDetails}
        </Button>
        <Button
          accessibilityLabel={`Remove ${getLinkLabel(item)}`}
          disabled={isMutateDisabled}
          onPress={() => handleDeleteLink(item.id)}
          size="icon-xs"
          variant="ghost"
          wrapperClassName="ml-2 -mr-1.5"
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
            'flex-row w-full min-w-0 gap-2 items-center justify-between px-4',
            triggerClassName
          )}
        >
          <Button
            className="flex-1 flex-row min-w-0 gap-2 items-center"
            disabled={!canMutateLink(firstItem)}
            onPress={() => handleEditLink(firstItem)}
            variant="link"
            wrapperClassName="flex-1 overflow-visible rounded-lg"
          >
            <LinkAttachmentDetails
              iconClassName={triggerIconClassName}
              label={getLinkLabel(firstItem)}
              trailing={
                <LinkUrlText
                  className="max-w-[45%] font-normal"
                  url={firstItem.url}
                />
              }
            />
          </Button>
          <View className="flex-row gap-2 items-center shrink-0">
            <Button
              accessibilityLabel={`Remove ${getLinkLabel(firstItem)}`}
              disabled={!canMutateLink(firstItem)}
              onPress={() => handleDeleteLink(firstItem.id)}
              size="icon-xs"
              variant="ghost"
              wrapperClassName="-mr-1.5"
            >
              <Icon icon={X} />
            </Button>
          </View>
        </View>
      ) : (
        <Button
          disabled={actionsDisabled}
          onPress={handleOpenSheet}
          variant="link"
          wrapperClassName="w-full overflow-visible rounded-lg"
          className={cn(
            'flex-row w-full min-w-0 gap-2 items-center px-4',
            triggerClassName
          )}
        >
          <LinkAttachmentDetails
            iconClassName={triggerIconClassName}
            label={getLinkLabel(firstItem)}
            trailing={
              <Text
                className="font-normal text-placeholder text-xs shrink-0"
                numberOfLines={1}
              >
                {moreLinksText}
              </Text>
            }
          />
        </Button>
      )}
      {shouldRenderSheet && (
        <Sheet
          loading={sheetLoading}
          onDismiss={() => setIsSheetOpen(false)}
          open={isSheetOpen}
          portalName={sheetPortalName}
          variant="list"
        >
          <SheetListScrollView
            ref={scrollViewRef}
            contentContainerClassName="py-5"
          >
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
    </View>
  );
};
