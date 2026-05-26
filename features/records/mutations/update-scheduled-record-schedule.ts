import { apiOrThrow } from '@/lib/api';

export const updateScheduledRecordSchedule = async ({
  date,
  id,
  text,
}: {
  date: string | number;
  id?: string;
  text?: string;
}) => {
  if (!id) return;

  return apiOrThrow(
    `/records/${id}/schedule`,
    {
      body: JSON.stringify({ date, text }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    },
    'Failed to update schedule'
  );
};
