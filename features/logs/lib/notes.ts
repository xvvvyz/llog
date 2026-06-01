export const LOG_NOTE_TEXT_MAX_LENGTH = 10240;

export const getLogNoteDisplayText = (text?: string | null) =>
  text?.trim() ?? '';

export const hasLogNoteText = (text?: string | null) =>
  !!getLogNoteDisplayText(text);

export const canShowLogNotesPreview = ({
  canManage,
  text,
}: {
  canManage?: boolean;
  text?: string | null;
}) => !!canManage && hasLogNoteText(text);
