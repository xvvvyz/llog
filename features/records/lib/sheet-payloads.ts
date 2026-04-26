import type { SheetManager } from '@/hooks/use-sheet-manager';
import type { SheetName } from '@/types/sheet-names';

export const RECORD_LINK_ATTACHMENTS_SHEET =
  'record-link-attachments' satisfies SheetName;

export const RECORD_LINK_EDITOR_SHEET =
  'record-link-editor' satisfies SheetName;

export type RecordSheetParent =
  | { id: string; type: 'record' }
  | { id: string; recordId: string; type: 'reply' };

export type RecordLinkAttachmentsSheetPayload = { parent: RecordSheetParent };

export type RecordLinkEditorSheetPayload =
  | { mode: 'create'; parent: RecordSheetParent }
  | { linkId: string; mode: 'edit' };

export const getRecordLinkAttachmentsSheetPayload = (
  sheetManager: SheetManager
) =>
  sheetManager.getPayload(RECORD_LINK_ATTACHMENTS_SHEET) as
    | RecordLinkAttachmentsSheetPayload
    | undefined;

export const openRecordLinkAttachmentsSheet = (
  sheetManager: SheetManager,
  payload: RecordLinkAttachmentsSheetPayload
) =>
  sheetManager.open(
    RECORD_LINK_ATTACHMENTS_SHEET,
    undefined,
    undefined,
    payload
  );

export const getRecordLinkEditorSheetPayload = (sheetManager: SheetManager) =>
  sheetManager.getPayload(RECORD_LINK_EDITOR_SHEET) as
    | RecordLinkEditorSheetPayload
    | undefined;

export const openRecordLinkEditorSheet = (
  sheetManager: SheetManager,
  payload: RecordLinkEditorSheetPayload
) => sheetManager.open(RECORD_LINK_EDITOR_SHEET, undefined, undefined, payload);
