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
  parent,
}: {
  links: Link[];
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
        className="gap-0"
        links={links}
        onDeleteLink={handleDeleteLink}
        parent={parent}
        triggerClassName="px-4"
      />
    ),
    [handleDeleteLink, links, parent]
  );

  const linkToolbarItems = (
    <Button
      disabled={!parent}
      onPress={handleOpenLinkEditor}
      size="icon-sm"
      variant="secondary"
    >
      <Icon icon={LinkSimple} />
    </Button>
  );

  return { linkAttachmentCount: links.length, linkPreview, linkToolbarItems };
};
