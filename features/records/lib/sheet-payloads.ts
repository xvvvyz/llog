import type { SheetManager } from '@/hooks/use-sheet-manager';
import type {
  RecordSheetParent,
  SheetName,
  SheetPayload,
} from '@/lib/sheet-names';

export const RECORD_LINK_ATTACHMENTS_SHEET =
  'record-link-attachments' satisfies SheetName;

export const RECORD_LINK_EDITOR_SHEET =
  'record-link-editor' satisfies SheetName;

export type { RecordSheetParent };

type RecordLinkAttachmentsSheetPayload = SheetPayload<
  typeof RECORD_LINK_ATTACHMENTS_SHEET
>;

type RecordLinkEditorSheetPayload = SheetPayload<
  typeof RECORD_LINK_EDITOR_SHEET
>;

export const getRecordLinkAttachmentsSheetPayload = (
  sheetManager: SheetManager
) => sheetManager.getPayload(RECORD_LINK_ATTACHMENTS_SHEET);

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
  sheetManager.getPayload(RECORD_LINK_EDITOR_SHEET);

export const openRecordLinkEditorSheet = (
  sheetManager: SheetManager,
  payload: RecordLinkEditorSheetPayload
) => sheetManager.open(RECORD_LINK_EDITOR_SHEET, undefined, undefined, payload);
