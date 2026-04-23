import { db } from '@/lib/db';

export const updateProfile = async ({
  avatarSeedId,
  id,
  name,
}: {
  avatarSeedId?: string;
  id: string;
  name?: string;
}) => {
  return db.transact(
    db.tx.profiles[id].update({ avatarSeedId, name: name?.trim() })
  );
};
