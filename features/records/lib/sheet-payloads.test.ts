import * as sheetPayloads from '@/features/records/lib/sheet-payloads';
import { describe, expect, mock, test } from 'bun:test';

const createSheetManager = (payloads: Record<string, unknown> = {}) => {
  const getPayload = mock((sheetName: string) => payloads[sheetName]);
  const open = mock(() => {});

  const sheetManager = { getPayload, open } as unknown as Parameters<
    typeof sheetPayloads.getRecordLinkAttachmentsSheetPayload
  >[0];

  return { getPayload, open, sheetManager };
};

describe('record link sheet payload helpers', () => {
  test('reads the link attachments payload from the expected sheet', () => {
    const payload = { parent: { id: 'record-1', type: 'record' as const } };

    const { getPayload, sheetManager } = createSheetManager({
      [sheetPayloads.RECORD_LINK_ATTACHMENTS_SHEET]: payload,
    });

    expect(
      sheetPayloads.getRecordLinkAttachmentsSheetPayload(sheetManager)
    ).toBe(payload);

    expect(getPayload).toHaveBeenCalledWith(
      sheetPayloads.RECORD_LINK_ATTACHMENTS_SHEET
    );
  });

  test('opens the link attachments sheet with the payload in the fourth slot', () => {
    const payload = {
      parent: { id: 'reply-1', recordId: 'record-1', type: 'reply' as const },
    };

    const { open, sheetManager } = createSheetManager();
    sheetPayloads.openRecordLinkAttachmentsSheet(sheetManager, payload);

    expect(open).toHaveBeenCalledWith(
      sheetPayloads.RECORD_LINK_ATTACHMENTS_SHEET,
      undefined,
      undefined,
      payload
    );
  });

  test('reads the link editor payload from the expected sheet', () => {
    const payload = { linkId: 'link-1', mode: 'edit' as const };

    const { getPayload, sheetManager } = createSheetManager({
      [sheetPayloads.RECORD_LINK_EDITOR_SHEET]: payload,
    });

    expect(sheetPayloads.getRecordLinkEditorSheetPayload(sheetManager)).toBe(
      payload
    );

    expect(getPayload).toHaveBeenCalledWith(
      sheetPayloads.RECORD_LINK_EDITOR_SHEET
    );
  });

  test('opens the link editor sheet with create and edit payloads', () => {
    const createPayload = {
      mode: 'create' as const,
      parent: { id: 'record-1', type: 'record' as const },
    };

    const editPayload = { linkId: 'link-1', mode: 'edit' as const };
    const { open, sheetManager } = createSheetManager();
    sheetPayloads.openRecordLinkEditorSheet(sheetManager, createPayload);
    sheetPayloads.openRecordLinkEditorSheet(sheetManager, editPayload);

    expect(open).toHaveBeenNthCalledWith(
      1,
      sheetPayloads.RECORD_LINK_EDITOR_SHEET,
      undefined,
      undefined,
      createPayload
    );

    expect(open).toHaveBeenNthCalledWith(
      2,
      sheetPayloads.RECORD_LINK_EDITOR_SHEET,
      undefined,
      undefined,
      editPayload
    );
  });
});
