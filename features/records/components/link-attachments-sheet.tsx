import { LinkAttachments } from '@/features/records/components/link-attachments';
import { deleteLink } from '@/features/records/mutations/delete-link';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import * as React from 'react';

import {
  getRecordLinkAttachmentsSheetPayload,
  RECORD_LINK_ATTACHMENTS_SHEET,
} from '@/features/records/lib/sheet-payloads';

export const LinkAttachmentsSheet = () => {
  const sheetManager = useSheetManager();
  const isOpen = sheetManager.isOpen(RECORD_LINK_ATTACHMENTS_SHEET);
  const parent = getRecordLinkAttachmentsSheetPayload(sheetManager)?.parent;
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
    sheetManager.close(RECORD_LINK_ATTACHMENTS_SHEET);
  }, [sheetManager]);

  React.useEffect(() => {
    if (isOpen && hasLoadedParent && !links.length) close();
  }, [close, hasLoadedParent, isOpen, links.length]);

  const handleDeleteLink = React.useCallback((linkId: string) => {
    void deleteLink({ id: linkId });
  }, []);

  return (
    <LinkAttachments
      hideTrigger
      links={links}
      onDeleteLink={handleDeleteLink}
      portalName={RECORD_LINK_ATTACHMENTS_SHEET}
      sheetOpen={isOpen}
      onSheetOpenChange={(open) => {
        if (!open) close();
      }}
    />
  );
};
