import type { SheetManager } from '@/hooks/use-sheet-manager';
import type { SheetName } from '@/lib/sheet-names';

export const RECORD_LINK_ATTACHMENTS_SHEET =
  'record-link-attachments' satisfies SheetName;

export const RECORD_LINK_EDITOR_SHEET =
  'record-link-editor' satisfies SheetName;

type LinkSnapshot = {
  id: string;
  label: string;
  localStatus?: 'error' | 'pending';
  order: number;
  teamId: string;
  url: string;
};

export type RecordSheetParent =
  | { id: string; links?: LinkSnapshot[]; teamId?: string; type: 'record' }
  | {
      id: string;
      links?: LinkSnapshot[];
      recordId: string;
      teamId?: string;
      type: 'reply';
    };

type RecordLinkAttachmentsSheetPayload = { parent: RecordSheetParent };

type RecordLinkEditorSheetPayload =
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
