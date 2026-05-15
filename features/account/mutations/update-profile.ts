import type { Profile } from '@/features/account/types/profile';
import { db } from '@/lib/db';

export const updateProfile = async ({
  avatarSeedId,
  id,
  name,
}: Pick<Profile, 'id'> & Partial<Pick<Profile, 'avatarSeedId' | 'name'>>) => {
  return db.transact(
    db.tx.profiles[id].update({ avatarSeedId, name: name?.trim() })
  );
};
