import { LinkAttachments } from '@/features/records/components/link-attachments';
import * as outboxStore from '@/features/offline/outbox-store';
import * as sheetPayloads from '@/features/records/lib/sheet-payloads';
import { deleteLink } from '@/features/records/mutations/delete-link';
import type { Link } from '@/features/records/types/link';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Link as LinkIcon } from 'phosphor-react-native';
import * as React from 'react';

export const useComposerLinkAttachments = ({
  actionsDisabled,
  links,
  onReorderLinks,
  parent,
}: {
  actionsDisabled?: boolean;
  links: Link[];
  onReorderLinks?: (links: { id: string }[]) => void;
  parent?: sheetPayloads.RecordSheetParent;
}) => {
  const sheetManager = useSheetManager();

  const handleDeleteLink = React.useCallback((linkId: string) => {
    const snapshot = outboxStore.getOutboxSnapshot();

    const isQueuedSubmissionLink = snapshot.submissions.some((submission) =>
      submission.links.some((link) => link.id === linkId)
    );

    const isQueuedDraftLink = snapshot.drafts.some((draft) =>
      draft.links.some((link) => link.id === linkId)
    );

    outboxStore.removeQueuedLink(linkId);
    outboxStore.removeQueuedDraftLink(linkId);
    if (isQueuedSubmissionLink || isQueuedDraftLink) return;
    void deleteLink({ id: linkId });
  }, []);

  const handleOpenLinkEditor = React.useCallback(() => {
    if (actionsDisabled) return;
    if (!parent) return;

    sheetPayloads.openRecordLinkEditorSheet(sheetManager, {
      mode: 'create',
      parent: { ...parent, links },
    });
  }, [actionsDisabled, links, parent, sheetManager]);

  const linkPreview = React.useMemo(
    () => (
      <LinkAttachments
        actionsDisabled={actionsDisabled}
        className={links.length === 1 ? '-my-1.5' : undefined}
        links={links}
        onDeleteLink={handleDeleteLink}
        onReorderLinks={onReorderLinks}
        parent={parent ? { ...parent, links } : undefined}
        triggerClassName="px-0"
      />
    ),
    [actionsDisabled, handleDeleteLink, links, onReorderLinks, parent]
  );

  const linkToolbarItems = (
    <Button
      disabled={actionsDisabled || !parent}
      onPress={handleOpenLinkEditor}
      size="icon-xs"
      variant="secondary"
    >
      <Icon icon={LinkIcon} />
    </Button>
  );

  return { linkAttachmentCount: links.length, linkPreview, linkToolbarItems };
};
