import { LinkAttachments } from '@/features/records/components/link-attachments';
import * as sheetPayloads from '@/features/records/lib/sheet-payloads';
import { deleteLink } from '@/features/records/mutations/delete-link';
import { reorderLinks } from '@/features/records/mutations/reorder-links';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import * as React from 'react';

export const LinkAttachmentsSheet = () => {
  const sheetManager = useSheetManager();

  const isOpen = sheetManager.isOpen(
    sheetPayloads.RECORD_LINK_ATTACHMENTS_SHEET
  );

  const parent =
    sheetPayloads.getRecordLinkAttachmentsSheetPayload(sheetManager)?.parent;

  const isRecord = parent?.type === 'record';
  const isReply = parent?.type === 'reply';

  const { data: recordData } = db.useQuery(
    isOpen && parent && isRecord
      ? { records: { $: { where: { id: parent.id } }, links: {} } }
      : null
  );

  const { data: replyData } = db.useQuery(
    isOpen && parent && isReply
      ? { replies: { $: { where: { id: parent.id } }, links: {} } }
      : null
  );

  const links = isRecord
    ? (recordData?.records?.[0]?.links ?? [])
    : (replyData?.replies?.[0]?.links ?? []);

  const hasLoadedParent = isRecord
    ? !!recordData?.records?.[0]
    : isReply
      ? !!replyData?.replies?.[0]
      : false;

  const close = React.useCallback(() => {
    sheetManager.close(sheetPayloads.RECORD_LINK_ATTACHMENTS_SHEET);
  }, [sheetManager]);

  React.useEffect(() => {
    if (isOpen && hasLoadedParent && !links.length) close();
  }, [close, hasLoadedParent, isOpen, links.length]);

  const handleDeleteLink = React.useCallback((linkId: string) => {
    void deleteLink({ id: linkId });
  }, []);

  const handleReorderLinks = React.useCallback((links: { id: string }[]) => {
    void reorderLinks(links);
  }, []);

  return (
    <LinkAttachments
      hideTrigger
      links={links}
      onDeleteLink={handleDeleteLink}
      onReorderLinks={handleReorderLinks}
      portalName={sheetPayloads.RECORD_LINK_ATTACHMENTS_SHEET}
      sheetOpen={isOpen}
      onSheetOpenChange={(open) => {
        if (!open) close();
      }}
    />
  );
};
