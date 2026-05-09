import { LinkAttachments } from '@/features/records/components/link-attachments';
import * as sheetPayloads from '@/features/records/lib/sheet-payloads';
import { deleteLink } from '@/features/records/mutations/delete-link';
import type { Link } from '@/features/records/types/link';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { LinkSimple } from 'phosphor-react-native';
import * as React from 'react';

export const useComposerLinkAttachments = ({
  links,
  onReorderLinks,
  parent,
}: {
  links: Link[];
  onReorderLinks?: (links: { id: string }[]) => void;
  parent?: sheetPayloads.RecordSheetParent;
}) => {
  const sheetManager = useSheetManager();

  const handleDeleteLink = React.useCallback((linkId: string) => {
    void deleteLink({ id: linkId });
  }, []);

  const handleOpenLinkEditor = React.useCallback(() => {
    if (!parent) return;

    sheetPayloads.openRecordLinkEditorSheet(sheetManager, {
      mode: 'create',
      parent,
    });
  }, [parent, sheetManager]);

  const linkPreview = React.useMemo(
    () => (
      <LinkAttachments
        className={links.length === 1 ? '-my-1' : undefined}
        links={links}
        onDeleteLink={handleDeleteLink}
        onReorderLinks={onReorderLinks}
        parent={parent}
        triggerClassName="px-4"
      />
    ),
    [handleDeleteLink, links, onReorderLinks, parent]
  );

  const linkToolbarItems = (
    <Button
      disabled={!parent}
      onPress={handleOpenLinkEditor}
      size="icon-xs"
      variant="secondary"
    >
      <Icon icon={LinkSimple} />
    </Button>
  );

  return { linkAttachmentCount: links.length, linkPreview, linkToolbarItems };
};
