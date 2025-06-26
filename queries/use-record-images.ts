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
