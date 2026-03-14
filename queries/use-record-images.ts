import { db } from '@/utilities/db';

export const useRecordImages = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id
      ? {
          records: {
            $: { fields: ['id'], where: { id } },
            images: {},
          },
        }
      : null
  );

  const record = data?.records?.[0];
  const images = record?.images ?? [];
  return { ...record, images, isLoading };
};

export const useCommentImages = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id
      ? {
          comments: {
            $: { fields: ['id'], where: { id } },
            images: {},
          },
        }
      : null
  );

  const comment = data?.comments?.[0];
  const images = comment?.images ?? [];
  return { ...comment, images, isLoading };
};
