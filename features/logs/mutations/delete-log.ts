import * as logDeletions from '@/features/logs/queries/log-deletions';
import { apiOrThrow } from '@/lib/api';

export const deleteLog = async ({
  id,
  teamId,
}: {
  id: string;
  teamId?: string;
}) => {
  logDeletions.hideLocallyDeletedLog({ id, teamId });

  try {
    return await apiOrThrow(
      `/logs/${id}`,
      { method: 'DELETE' },
      'Failed to delete log'
    );
  } catch (error) {
    logDeletions.restoreLocallyDeletedLog(id);
    throw error;
  }
};
