import { db } from '@/utilities/db';

export const useRecordMedia = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id
      ? {
          records: {
            $: { fields: ['id'], where: { id } },
            media: {},
          },
        }
      : null
  );

  const record = data?.records?.[0];
  const media = record?.media ?? [];
  return { ...record, media, isLoading };
};

export const useReplyMedia = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id
      ? {
          replies: {
            $: { fields: ['id'], where: { id } },
            media: {},
          },
        }
      : null
  );

  const reply = data?.replies?.[0];
  const media = reply?.media ?? [];
  return { ...reply, media, isLoading };
};
