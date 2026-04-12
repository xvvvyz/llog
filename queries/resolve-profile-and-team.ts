import { getProfile } from '@/queries/get-profile';

export const resolveProfileAndTeam = async (
  profileId?: string,
  teamId?: string
) => {
  let resolvedProfileId = profileId;

  if (!resolvedProfileId) {
    const profile = await getProfile();
    resolvedProfileId = profile?.id;
  }

  if (!resolvedProfileId || !teamId) return null;
  return { profileId: resolvedProfileId, teamId };
};
