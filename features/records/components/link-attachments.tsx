import type { Link } from '@/features/records/types/link';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { alert as showAlert } from '@/lib/alert';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { ArrowSquareOut, LinkSimple, X } from 'phosphor-react-native';
import * as React from 'react';
import { Linking, ScrollView, View } from 'react-native';

import {
  getLinkUrlDisplayText,
  normalizeLinkUrl,
} from '@/features/records/lib/link-url';

import {
  openRecordLinkAttachmentsSheet,
  openRecordLinkEditorSheet,
  type RecordSheetParent,
} from '@/features/records/lib/sheet-payloads';

const byOrder = (a: Link, b: Link) => (a.order ?? 0) - (b.order ?? 0);
const getLinkLabel = (item: Link) => item.label?.trim() || 'Link';

export const LinkAttachments = ({
  className,
  hideTrigger,
  links,
  onDeleteLink,
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
  onSheetOpenChange?: (open: boolean) => void;
  parent?: RecordSheetParent;
  portalName?: string;
  sheetOpen?: boolean;
  triggerClassName?: string;
  triggerIconClassName?: string;
}) => {
  const sheetManager = useSheetManager();
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
  const shouldOpenLinksInline = !onDeleteLink;

  const shouldRenderSheet =
    !shouldOpenLinksInline &&
    (!canDeleteSingleLink || hideTrigger || isSheetOpen);

  const moreLinksText = items.length > 1 ? `+${items.length - 1} more` : null;

  const handleOpenLink = React.useCallback(async (item: Link) => {
    const url = normalizeLinkUrl(item.url);

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
      openRecordLinkAttachmentsSheet(sheetManager, { parent });
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
      openRecordLinkEditorSheet(sheetManager, { linkId, mode: 'edit' });
    },
    [sheetManager]
  );

  if (!items.length || !firstItem) return null;

  const renderOpenLink = (item: Link) => (
    <Button
      key={item.id}
      onPress={() => void handleOpenLink(item)}
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
          icon={ArrowSquareOut}
        />
        <Text
          className="font-normal text-muted-foreground text-sm shrink"
          numberOfLines={1}
        >
          {getLinkLabel(item)}
        </Text>
      </View>
      <View className="flex-row gap-2 items-center shrink-0">
        <Text
          className="font-normal text-placeholder text-xs"
          numberOfLines={1}
        >
          {getLinkUrlDisplayText(item.url)}
        </Text>
      </View>
    </Button>
  );

  const firstLinkDetails = (
    <View className="flex-1 flex-row min-w-0 gap-2 items-center">
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

  return (
    <View className={cn(shouldOpenLinksInline ? 'gap-4' : 'gap-2', className)}>
      {hideTrigger ? null : shouldOpenLinksInline ? (
        items.map(renderOpenLink)
      ) : canDeleteSingleLink ? (
        <View
          className={cn(
            'flex-row h-8 w-full -my-2.5 gap-4 justify-between px-4',
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
            <Text
              className="font-normal text-placeholder text-xs shrink-0"
              numberOfLines={1}
            >
              {getLinkUrlDisplayText(firstItem.url)}
            </Text>
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
            'flex-row h-8 w-full -my-2.5 gap-4 justify-between px-4',
            triggerClassName
          )}
        >
          {firstLinkDetails}
          <View className="shrink-0">
            <Text
              className="font-normal text-placeholder text-sm"
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
        >
          <ScrollView
            className="-mx-px max-h-[19rem] min-h-0 border-b border-border-secondary border-x rounded-b-4xl"
            contentContainerClassName="mx-auto w-full max-w-lg px-8 py-5"
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => {
              const linkDetails = (
                <View className="flex-1 flex-row min-w-0 gap-4 items-center justify-between">
                  <View className="flex-1 flex-row min-w-0 gap-2 items-center">
                    <Icon className="text-placeholder" icon={LinkSimple} />
                    <Text
                      className="text-muted-foreground text-sm shrink"
                      numberOfLines={1}
                    >
                      {getLinkLabel(item)}
                    </Text>
                  </View>
                  <Text
                    className="text-placeholder text-xs shrink-0"
                    numberOfLines={1}
                  >
                    {getLinkUrlDisplayText(item.url)}
                  </Text>
                </View>
              );

              return (
                <View key={item.id} className="flex-row gap-4 items-center">
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
