import * as logNotes from '@/features/logs/lib/notes';
import { db } from '@/lib/db';
import { id as generateId } from '@instantdb/react-native';

const getExistingNoteId = async (logId: string) => {
  const { data } = await db.queryOnce({
    notes: { $: { fields: ['id' as const], where: { logId } } },
  });

  const noteId = data.notes?.[0]?.id;
  return typeof noteId === 'string' ? noteId : undefined;
};

export const deleteNote = async ({
  logId,
  noteId,
  teamId,
}: {
  logId?: string;
  noteId?: string;
  teamId?: string;
}) => {
  if (!logId || !teamId) return;

  const existingNoteId =
    typeof noteId === 'string' ? noteId : await getExistingNoteId(logId);

  if (!existingNoteId) return;
  return db.transact(db.tx.notes[existingNoteId].delete());
};

export const updateNote = async ({
  logId,
  noteId,
  teamId,
  text,
}: {
  logId?: string;
  noteId?: string;
  teamId?: string;
  text: string;
}) => {
  if (!logId || !teamId || text.length > logNotes.LOG_NOTE_TEXT_MAX_LENGTH) {
    return;
  }

  if (!text.trim()) return deleteNote({ logId, noteId, teamId });

  const existingNoteId =
    typeof noteId === 'string' ? noteId : await getExistingNoteId(logId);

  if (existingNoteId) {
    return db.transact(db.tx.notes[existingNoteId].update({ text }));
  }

  return db.transact(
    db.tx.notes[generateId()]
      .update({ logId, teamId, text })
      .link({ log: logId })
  );
};
