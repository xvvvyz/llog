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

export const useCommentMedia = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id
      ? {
          comments: {
            $: { fields: ['id'], where: { id } },
            media: {},
          },
        }
      : null
  );

  const comment = data?.comments?.[0];
  const media = comment?.media ?? [];
  return { ...comment, media, isLoading };
};
