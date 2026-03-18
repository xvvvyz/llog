import { getActiveTeamId } from '@/queries/get-active-team-id';
import { getProfile } from '@/queries/get-profile';

export const resolveProfileAndTeam = async (
  profileId?: string,
  teamId?: string
) => {
  let resolvedProfileId = profileId;
  let resolvedTeamId = teamId;

  if (!resolvedProfileId || !resolvedTeamId) {
    const [profile, activeTeamId] = await Promise.all([
      resolvedProfileId ? null : getProfile(),
      resolvedTeamId ? null : getActiveTeamId(),
    ]);

    resolvedProfileId = resolvedProfileId ?? profile?.id;
    resolvedTeamId = resolvedTeamId ?? activeTeamId ?? undefined;
  }

  if (!resolvedProfileId || !resolvedTeamId) return null;

  return { profileId: resolvedProfileId, teamId: resolvedTeamId };
};
