import type { AudioFile } from '@/api/audio-analysis/types';
import type { Db } from '@/api/middleware/db';

export const getAudioFile = async (db: Db, fileId: string) => {
  const { files } = await db.query({ files: { $: { where: { id: fileId } } } });
  return files[0] as AudioFile | undefined;
};

export const updateAudioFile = (
  db: Db,
  fileId: string,
  fields: Record<string, unknown>
) => db.transact(db.tx.files[fileId].update(fields));
