import { db } from '@/lib/db';
import { getProfile } from '@/queries/get-profile';
import { nanoid } from 'nanoid';

export const randomizeProfileAvatar = async ({
  profileId,
}: { profileId?: string } = {}) => {
  const resolvedProfileId = profileId ?? (await getProfile())?.id;
  if (!resolvedProfileId) return;

  return db.transact(
    db.tx.profiles[resolvedProfileId].update({
      avatarSeedId: nanoid(6),
    })
  );
};
